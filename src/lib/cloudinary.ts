// src/lib/cloudinary.ts — Cloudinary unsigned upload with optional eager transform
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  duration?: number
  bytes: number
  format: string
  resource_type: string
  width?: number
  height?: number
  /** Present if eager transformation was requested */
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
  /** Cloudinary eager transformation string, e.g. "w_1080,h_1920,c_fill,q_auto:best/mp4" */
  eager?: string
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
  formData.append('resource_type', 'video')
  formData.append('folder', 'tiktok-optimizer')

  // Eager transformation for quality/resolution optimization
  // Cloudinary re-encodes on their servers — no local backend needed!
  if (options?.eager) {
    formData.append('eager', options.eager)
    formData.append('eager_async', 'false') // wait for result synchronously
  }

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
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error('Cloudinary upload failed: ' + xhr.status + ' ' + xhr.responseText))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'))
    xhr.send(formData)
  })
}
