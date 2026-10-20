// src/lib/backend.ts - talks to local FastAPI
import axios from 'axios'

const BASE = import.meta.env.VITE_LOCAL_BACKEND_URL ?? 'http://localhost:8000'

export const backendApi = axios.create({ baseURL: BASE, timeout: 0 })

export interface Capabilities {
  qsv: boolean
  encoder: string
  ffmpeg: string
  ffprobe: string
}

export async function getCapabilities(): Promise<Capabilities> {
  const { data } = await backendApi.get<Capabilities>('/video/capabilities')
  return data
}

export interface ProcessOptions {
  resolution?: string
  crf?: number
  preset?: string
}

export async function processVideo(
  file: File,
  options: ProcessOptions = {},
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const form = new FormData()
  form.append('file', file)
  form.append('resolution', options.resolution ?? '1080x1920')
  form.append('crf', String(options.crf ?? 18))
  form.append('preset', options.preset ?? 'slow')

  const { data } = await backendApi.post<Blob>('/video/process', form, {
    responseType: 'blob',
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 50))
    },
    onDownloadProgress: (e) => {
      if (e.total && onProgress) onProgress(50 + Math.round((e.loaded / e.total) * 50))
    },
  })
  return data
}

export async function probeVideo(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await backendApi.post('/video/probe', form)
  return data
}
