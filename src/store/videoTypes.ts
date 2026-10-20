export type VideoStatus = 'idle' | 'uploading' | 'done' | 'error'

export interface VideoJob {
  id: string
  filename: string
  originalSize: number
  processedSize?: number
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  status: VideoStatus
  progress: number
  error?: string
  createdAt: number
  // Original video metadata (read client-side from file)
  duration?: number
  width?: number
  height?: number
  codec?: string
  // Processing settings chosen by user
  resolution: string      // '1080x1920' | '1920x1080' | '1080x1080' | '' = keep original
  qualityLabel: string    // 'Maximum' | 'High' | 'Good'
  fps: number             // 60 | 30 | 24
}
