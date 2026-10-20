import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { VideoJob, VideoStatus } from './videoTypes'

export type { VideoJob, VideoStatus }

interface VideoStore {
  jobs: VideoJob[]
  addJob: (job: Omit<VideoJob, 'createdAt'>) => void
  updateJob: (id: string, patch: Partial<VideoJob>) => void
  clearJob: (id: string) => void
  saveToFirestore: (job: VideoJob) => Promise<void>
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set) => ({
      jobs: [],

      addJob: (job) =>
        set((s) => ({
          jobs: [{ ...job, createdAt: Date.now() }, ...s.jobs],
        })),

      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        })),

      clearJob: (id) =>
        set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

      saveToFirestore: async (job) => {
        try {
          await addDoc(collection(db, 'videos'), {
            filename: job.filename,
            cloudinaryUrl: job.cloudinaryUrl ?? null,
            cloudinaryPublicId: job.cloudinaryPublicId ?? null,
            originalSize: job.originalSize,
            processedSize: job.processedSize ?? null,
            duration: job.duration ?? null,
            width: job.width ?? null,
            height: job.height ?? null,
            fps: job.fps ?? null,
            resolution: job.resolution,
            qualityLabel: job.qualityLabel,
            createdAt: serverTimestamp(),
          })
        } catch (e) {
          console.warn('Firestore save failed (check config):', e)
        }
      },
    }),
    { name: 'clearcut-jobs', partialize: (s) => ({ jobs: s.jobs }) }
  )
)
