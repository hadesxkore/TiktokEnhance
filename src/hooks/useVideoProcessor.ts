import { useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { uploadToCloudinary, buildTransformedUrl } from '../lib/cloudinary'
import { useVideoStore } from '../store/videoStore'

export interface OptimizeOptions {
  resolution: string    // '1080x1920' | '1920x1080' | '1080x1080' | '' (keep original)
  quality: 'best' | 'good' | 'eco'
  qualityLabel: string
  fps: number           // 24 | 30 | 60
}

/** Build a Cloudinary eager transformation string based on user settings.
 *  Cloudinary handles re-encoding on their servers — no local FFmpeg needed.
 *  This is what allows TikTok videos to survive TikTok's compression.
 */
function buildEager(options: OptimizeOptions): string {
  const parts: string[] = []

  if (options.resolution) {
    const [w, h] = options.resolution.split('x')
    parts.push(`w_${w},h_${h},c_fill`)
  }

  const q =
    options.quality === 'best' ? 'q_auto:best'
    : options.quality === 'good' ? 'q_auto:good'
    : 'q_auto:eco'
  parts.push(q)

  parts.push(`r_${options.fps}`)

  return parts.join(',') + '/mp4'
}

export function useVideoProcessor() {
  const { addJob, updateJob, saveToFirestore, jobs } = useVideoStore()

  const process = useCallback(
    async (file: File, options: OptimizeOptions) => {
      const id = uuid()

      addJob({
        id,
        filename: file.name,
        originalSize: file.size,
        status: 'uploading',
        progress: 0,
        resolution: options.resolution,
        qualityLabel: options.qualityLabel,
        fps: options.fps,
      })

      try {
        updateJob(id, { status: 'uploading', progress: 3 })

        const eager = buildEager(options)

        const result = await uploadToCloudinary(
          file,
          file.name,
          (pct) => { updateJob(id, { progress: 3 + Math.round(pct * 0.94) }) }
        )

        // Build the optimized TikTok URL via Cloudinary dynamic transformation
        const optimizedUrl   = buildTransformedUrl(result.secure_url, eager)
        const optimizedBytes = result.bytes

        const finalJob = {
          ...useVideoStore.getState().jobs.find((j) => j.id === id)!,
          cloudinaryUrl: optimizedUrl,
          cloudinaryPublicId: result.public_id,
          processedSize: optimizedBytes,
          status: 'done' as const,
          progress: 100,
        }

        updateJob(id, {
          cloudinaryUrl: optimizedUrl,
          cloudinaryPublicId: result.public_id,
          processedSize: optimizedBytes,
          status: 'done',
          progress: 100,
        })

        await saveToFirestore(finalJob)
        return id
      } catch (err: unknown) {
        updateJob(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        })
        return id
      }
    },
    [addJob, updateJob, saveToFirestore]
  )

  return { process, jobs }
}
