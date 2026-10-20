// src/lib/cloudinary.ts — Cloudinary upload with on-the-fly and eager transforms
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dqndurz00'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'TiktokVideo'

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  duration?: number
  bytes: number
  format: string
  resource_type: string
  width?: number
  height?: number
  /** Present if eager transformation was requested and returned */
  eager?: Array<{
    secure_url: string
    url: string
    bytes: number
    width: number
    height: number
    format: string
  }>
}

export interface UploadOptions {
  /** Cloudinary eager transformation string, e.g. "w_1080,h_1920,c_fill,q_auto:best,r_60" */
  eager?: string
}

/**
 * Builds an on-the-fly transformed Cloudinary video URL.
 * Works even if the unsigned upload preset does not have eager transformations enabled.
 */
export function buildTransformedUrl(secureUrl: string, transformString?: string): string {
  if (!transformString || !secureUrl) return secureUrl
  // Cloudinary URL format: https://res.cloudinary.com/{cloud}/video/upload/{version}/{public_id}.{format}
  const needle = '/video/upload/'
  const idx = secureUrl.indexOf(needle)
  if (idx === -1) return secureUrl
  
  const cleanTransform = transformString.replace(/\/mp4$/, '')
  return `${secureUrl.slice(0, idx + needle.length)}${cleanTransform}/${secureUrl.slice(idx + needle.length)}`
}

/**
 * Converts any Cloudinary video URL into a direct-download URL with Content-Disposition: attachment.
 * This forces iOS/Android/PC browsers to save the video file directly to the device storage
 * instead of opening the boring black HTML5 browser video player.
 */
export function getDownloadUrl(url: string, filename = 'tiktok_enhanced'): string {
  if (!url) return url
  const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
  const needle = '/video/upload/'
  const idx = url.indexOf(needle)
  if (idx === -1) return url

  return `${url.slice(0, idx + needle.length)}fl_attachment:${cleanName}/${url.slice(idx + needle.length)}`
}

const CHUNK_SIZE = 6 * 1024 * 1024 // 6 MB (Cloudinary requires >= 5MB per chunk)

/**
 * Uploads large videos (e.g. 100MB - 500MB+) in 6MB chunks.
 * Bypasses Cloudinary's 100MB single-request limit and avoids mobile socket timeouts.
 */
async function uploadChunked(
  file: Blob | File,
  filename: string,
  onProgress?: (pct: number) => void
): Promise<CloudinaryUploadResult> {
  const totalBytes = file.size
  const uniqueUploadId = 'cld_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`

  let start = 0
  let lastResult: CloudinaryUploadResult | null = null

  while (start < totalBytes) {
    const end = Math.min(start + CHUNK_SIZE, totalBytes)
    const chunk = file.slice(start, end)
    const contentRange = `bytes ${start}-${end - 1}/${totalBytes}`

    const formData = new FormData()
    formData.append('file', chunk, filename)
    formData.append('upload_preset', UPLOAD_PRESET)

    const chunkResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('X-Unique-Upload-Id', uniqueUploadId)
      xhr.setRequestHeader('Content-Range', contentRange)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const currentTotalLoaded = start + e.loaded
          onProgress(Math.min(98, Math.round((currentTotalLoaded / totalBytes) * 100)))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error('Invalid response received from Cloudinary chunk.'))
          }
        } else {
          let errorMsg = `Cloudinary chunk failed (HTTP ${xhr.status})`
          try {
            const res = JSON.parse(xhr.responseText)
            if (res.error?.message) errorMsg = res.error.message
          } catch {
            if (xhr.responseText) errorMsg += `: ${xhr.responseText.slice(0, 150)}`
          }
          reject(new Error(errorMsg))
        }
      }

      xhr.onerror = () => {
        reject(
          new Error(
            `Connection lost during chunk upload (${(start / (1024 * 1024)).toFixed(0)}MB / ${(totalBytes / (1024 * 1024)).toFixed(0)}MB). Check mobile data / Wi-Fi.`
          )
        )
      }

      xhr.send(formData)
    })

    lastResult = chunkResult
    start = end
    if (onProgress) onProgress(Math.min(98, Math.round((start / totalBytes) * 100)))
  }

  if (!lastResult || !lastResult.secure_url) {
    throw new Error('Chunked upload completed, but Cloudinary did not return a video URL.')
  }

  return lastResult
}

export async function uploadToCloudinary(
  file: Blob | File,
  filename: string,
  onProgress?: (pct: number) => void,
  options?: UploadOptions
): Promise<CloudinaryUploadResult> {
  // If video is larger than 20MB, automatically use Chunked Upload to bypass Cloudinary's 100MB limit
  if (file.size > 20 * 1024 * 1024) {
    return uploadChunked(file, filename, onProgress)
  }

  const formData = new FormData()
  formData.append('file', file, filename)
  formData.append('upload_preset', UPLOAD_PRESET)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid JSON response received from Cloudinary.'))
        }
      } else {
        let errorMsg = `Cloudinary returned HTTP ${xhr.status}`
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.error?.message) {
            errorMsg = res.error.message
          }
        } catch {
          if (xhr.responseText) errorMsg += `: ${xhr.responseText.slice(0, 150)}`
        }
        reject(new Error(errorMsg))
      }
    }

    xhr.onerror = () => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      reject(
        new Error(
          `Cloudinary network connection failed (${sizeMB}MB). Common causes: unstable mobile connection or timeout.`
        )
      )
    }

    xhr.send(formData)
  })
}
