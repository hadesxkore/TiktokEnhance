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

export async function uploadToCloudinary(
  file: Blob | File,
  filename: string,
  onProgress?: (pct: number) => void,
  options?: UploadOptions
): Promise<CloudinaryUploadResult> {
  const formData = new FormData()
  formData.append('file', file, filename)
  formData.append('upload_preset', UPLOAD_PRESET)

  // NOTE: We deliberately do NOT send 'eager' in the upload POST body.
  // Sending 'eager' makes Cloudinary stall the HTTP response while transcoding
  // the entire video synchronously. On videos longer than 15-20s, this causes
  // mobile carriers and browsers to drop the connection with a Network Error!
  // Instead, buildTransformedUrl provides on-demand CDN delivery transformation.

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
      // Diagnostic check for common causes:
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      reject(
        new Error(
          `Cloudinary network connection failed (${sizeMB}MB). Common causes: file exceeds upload preset limit, unstable mobile connection, or Cloudinary blocked the request.`
        )
      )
    }

    xhr.send(formData)
  })
}
