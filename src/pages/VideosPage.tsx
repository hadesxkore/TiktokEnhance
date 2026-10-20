import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Download01Icon,
  Loading03Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Upload01Icon,
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { useVideoStore } from '../store/videoStore'
import type { VideoJob } from '../store/videoStore'
import { getDownloadUrl } from '../lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

/* ── Helpers ────────────────────────────────────────────────── */

function fmt(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`
}

function fmtDuration(s?: number) {
  if (!s) return null
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function StatusBadge({ status }: { status: VideoJob['status'] }) {
  const map: Record<VideoJob['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    idle:      { label: 'Idle',       variant: 'outline' },
    uploading: { label: 'Uploading…', variant: 'secondary' },
    done:      { label: 'Done',       variant: 'default' },
    error:     { label: 'Error',      variant: 'destructive' },
  }
  const { label, variant } = map[status] ?? map.idle
  return <Badge variant={variant}>{label}</Badge>
}

/* ── Video card ─────────────────────────────────────────────── */

function VideoCard({ job }: { job: VideoJob }) {
  const isActive  = job.status === 'uploading'
  const clearJob  = useVideoStore((s) => s.clearJob)
  const [copied, setCopied] = useState(false)

  const download = () => {
    if (!job.cloudinaryUrl) return
    const downloadUrl = getDownloadUrl(job.cloudinaryUrl, `tiktok_${job.filename}`)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.setAttribute('download', `tiktok_${job.filename}`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const copyUrl = async () => {
    if (!job.cloudinaryUrl) return
    try {
      await navigator.clipboard.writeText(job.cloudinaryUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: create a temp input
      const el = document.createElement('input')
      el.value = job.cloudinaryUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4 transition-colors',
        isActive ? 'border-primary/30 bg-primary/5' : 'border-border'
      )}
    >
      {/* Thumbnail */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
        {job.cloudinaryUrl ? (
          <video src={job.cloudinaryUrl} muted playsInline className="h-full w-full object-cover" />
        ) : isActive ? (
          <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin text-primary" />
        ) : job.status === 'error' ? (
          <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-destructive" />
        ) : (
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-medium">{job.filename}</p>
          <StatusBadge status={job.status} />
        </div>

        {/* Settings chips */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {job.resolution ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {job.resolution.replace('x', '×')}
            </span>
          ) : (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Original</span>
          )}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {job.qualityLabel} quality
          </span>
          {job.fps && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {job.fps} fps
            </span>
          )}
          {fmtDuration(job.duration) && (
            <span className="text-[10px] text-muted-foreground">{fmtDuration(job.duration)}</span>
          )}
        </div>

        {/* Size comparison */}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{fmt(job.originalSize)}</span>
          {job.processedSize && (
            <>
              <span className="text-muted-foreground/40">→</span>
              <span className="text-primary font-medium">{fmt(job.processedSize)}</span>
              <span className="text-muted-foreground/60">
                ({Math.round((1 - job.processedSize / job.originalSize) * 100) > 0
                  ? `−${Math.round((1 - job.processedSize / job.originalSize) * 100)}%`
                  : `+${Math.round((job.processedSize / job.originalSize - 1) * 100)}%`
                })
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mt-2">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{job.progress}%</p>
          </div>
        )}

        {/* Error */}
        {job.status === 'error' && (
          <p className="mt-1 text-[10px] text-destructive">{job.error}</p>
        )}

        {/* Actions */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {job.status === 'done' && job.cloudinaryUrl && (
            <>
              <Button
                id={`download-btn-${job.id}`}
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[10px]"
                onClick={download}
              >
                <HugeiconsIcon icon={Download01Icon} size={11} />
                Download
              </Button>
              <Button
                id={`copy-url-btn-${job.id}`}
                size="sm"
                variant="ghost"
                className={cn(
                  'h-6 gap-1 px-2 text-[10px]',
                  copied ? 'text-primary' : 'text-muted-foreground'
                )}
                onClick={copyUrl}
              >
                <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={11} />
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
            </>
          )}
          <Button
            id={`remove-btn-${job.id}`}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => clearJob(job.id)}
            disabled={isActive}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export function VideosPage() {
  const jobs    = useVideoStore((s) => s.jobs)
  const active  = jobs.filter((j) => j.status === 'uploading')
  const done    = jobs.filter((j) => j.status === 'done')
  const errored = jobs.filter((j) => j.status === 'error')

  if (jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <HugeiconsIcon icon={Upload01Icon} size={22} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No videos yet</p>
        <p className="mt-1 text-xs text-muted-foreground mb-5">
          Optimize and upload a video to see it here
        </p>
        <Link to="/">
          <Button size="sm" variant="outline">Upload now</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full px-4 py-6 sm:px-8 sm:py-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">My Videos</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Optimized and uploaded videos — ready for TikTok
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {active.length > 0 && (
          <section>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Processing & Uploading
            </p>
            <div className="flex flex-col gap-2">
              {active.map((j) => <VideoCard key={j.id} job={j} />)}
            </div>
          </section>
        )}
        {done.length > 0 && (
          <section>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ready
            </p>
            <div className="flex flex-col gap-2">
              {done.map((j) => <VideoCard key={j.id} job={j} />)}
            </div>
          </section>
        )}
        {errored.length > 0 && (
          <section>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Failed
            </p>
            <div className="flex flex-col gap-2">
              {errored.map((j) => <VideoCard key={j.id} job={j} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
