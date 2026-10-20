import { useCallback, useState, useRef, useEffect } from 'react'
import { useVideoProcessor } from '../hooks/useVideoProcessor'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Upload01Icon,
  VideoIcon,
  CloudUploadIcon,
  Tick01Icon,
  SparklesIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Config ────────────────────────────────────────────────── */

const RESOLUTIONS = [
  {
    label: 'Portrait',
    sublabel: '1080 × 1920',
    tag: '9:16',
    tip: 'TikTok native',
    value: '1080x1920',
    recommended: true,
  },
  {
    label: 'Landscape',
    sublabel: '1920 × 1080',
    tag: '16:9',
    tip: 'YouTube / wide',
    value: '1920x1080',
    recommended: false,
  },
  {
    label: 'Square',
    sublabel: '1080 × 1080',
    tag: '1:1',
    tip: 'Instagram',
    value: '1080x1080',
    recommended: false,
  },
  {
    label: 'Original',
    sublabel: 'Keep as-is',
    tag: '—',
    tip: 'No resize',
    value: '',
    recommended: false,
  },
]

const QUALITY_PRESETS = [
  {
    label: 'Maximum',
    quality: 'best' as const,
    description: 'Best for TikTok — survives re-compression',
    bitrate: '~8–12 Mbps',
    recommended: true,
  },
  {
    label: 'High',
    quality: 'good' as const,
    description: 'Good balance of size and quality',
    bitrate: '~4–6 Mbps',
    recommended: false,
  },
  {
    label: 'Good',
    quality: 'eco' as const,
    description: 'Smaller file, still looks fine',
    bitrate: '~2–3 Mbps',
    recommended: false,
  },
]

const FPS_OPTIONS = [
  { label: '60 fps', value: 60, tip: 'Smoothest motion', recommended: true },
  { label: '30 fps', value: 30, tip: 'Standard', recommended: false },
  { label: '24 fps', value: 24, tip: 'Cinematic', recommended: false },
]

/* ── Helpers ────────────────────────────────────────────────── */

function fmt(bytes: number) {
  return bytes > 1e9
    ? `${(bytes / 1e9).toFixed(2)} GB`
    : `${(bytes / 1e6).toFixed(1)} MB`
}

function fmtDuration(s: number) {
  const m   = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface VideoMeta {
  duration: number
  width: number
  height: number
}

function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url   = URL.createObjectURL(file)
    video.src   = url
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width:    video.videoWidth,
        height:   video.videoHeight,
      })
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ duration: 0, width: 0, height: 0 })
    }
  })
}

/* ── Component ─────────────────────────────────────────────── */

export function UploadPage() {
  const { process }                       = useVideoProcessor()
  const [dragging, setDragging]           = useState(false)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [videoMeta, setVideoMeta]         = useState<VideoMeta | null>(null)
  const [resolution, setResolution]       = useState('1080x1920')
  const [qualityIdx, setQualityIdx]       = useState(0)
  const [fps, setFps]                     = useState(60)
  const [uploading, setUploading]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const f = files[0]
    if (!f.type.startsWith('video/')) return
    setSelectedFile(f)
    setVideoMeta(null)
    const meta = await readVideoMeta(f)
    setVideoMeta(meta)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  // Clear meta when file is cleared
  useEffect(() => {
    if (!selectedFile) setVideoMeta(null)
  }, [selectedFile])

  const handleSubmit = async () => {
    if (!selectedFile) return
    const q = QUALITY_PRESETS[qualityIdx]
    setUploading(true)
    try {
      await process(selectedFile, {
        resolution,
        quality:      q.quality,
        qualityLabel: q.label,
        fps,
      })
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const isOptimalCombo = resolution === '1080x1920' && qualityIdx === 0 && fps === 60

  return (
    <div className="flex flex-col min-h-full px-4 py-6 sm:px-8 sm:py-8 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Optimize for TikTok</h1>
          {isOptimalCombo && (
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <HugeiconsIcon icon={SparklesIcon} size={10} />
              Optimal
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          TikTok re-compresses every upload, often ruining quality. We pre-encode
          yours with TikTok-optimized settings so the final result looks as good as possible.
        </p>
      </div>

      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Video upload drop zone"
        id="video-dropzone"
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer select-none',
          'min-h-44 px-4 py-8 text-center',
          dragging     ? 'border-primary bg-primary/8 scale-[0.99]' :
          selectedFile ? 'border-primary/40 bg-primary/5'           :
                         'border-border hover:border-primary/35 hover:bg-muted/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !selectedFile && fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
          id="video-file-input"
        />

        {selectedFile ? (
          <div className="flex w-full flex-col items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
              <HugeiconsIcon icon={VideoIcon} size={20} className="text-primary" />
            </div>

            <div className="w-full max-w-xs">
              <p className="truncate text-sm font-medium px-2">{selectedFile.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{fmt(selectedFile.size)}</p>
            </div>

            {/* Metadata chips */}
            {videoMeta && (videoMeta.duration > 0 || videoMeta.width > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {videoMeta.width > 0 && videoMeta.height > 0 && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {videoMeta.width}×{videoMeta.height}
                  </span>
                )}
                {videoMeta.duration > 0 && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {fmtDuration(videoMeta.duration)}
                  </span>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
            >
              Change file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon icon={Upload01Icon} size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop your video here</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                or tap to browse · MP4, MOV, MKV, AVI
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Resolution ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Output Resolution
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RESOLUTIONS.map((r) => {
            const active = resolution === r.value
            return (
              <button
                key={r.value}
                id={`res-${r.value || 'original'}`}
                onClick={() => setResolution(r.value)}
                className={cn(
                  'relative flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                {r.recommended && (
                  <span className="absolute -top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                    TikTok
                  </span>
                )}
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold">{r.label}</span>
                  {active && <HugeiconsIcon icon={Tick01Icon} size={12} className="text-primary" />}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{r.sublabel}</span>
                <span className="text-[10px] text-muted-foreground/60">{r.tip}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Quality ── */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Quality Preset
        </p>
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_PRESETS.map((q, i) => {
            const active = qualityIdx === i
            return (
              <button
                key={i}
                id={`quality-${q.label.toLowerCase()}`}
                onClick={() => setQualityIdx(i)}
                className={cn(
                  'relative flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                {q.recommended && (
                  <span className="absolute -top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                    Best
                  </span>
                )}
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold">{q.label}</span>
                  {active && <HugeiconsIcon icon={Tick01Icon} size={12} className="text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground leading-snug hidden sm:block">
                  {q.description}
                </span>
                <span className="text-[10px] font-mono text-primary/70">{q.bitrate}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── FPS ── */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Frame Rate
        </p>
        <div className="flex gap-2">
          {FPS_OPTIONS.map((f) => {
            const active = fps === f.value
            return (
              <button
                key={f.value}
                id={`fps-${f.value}`}
                onClick={() => setFps(f.value)}
                className={cn(
                  'relative flex flex-1 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                {f.recommended && (
                  <span className="absolute -top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                    Smooth
                  </span>
                )}
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold">{f.label}</span>
                  {active && <HugeiconsIcon icon={Tick01Icon} size={12} className="text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{f.tip}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className={cn(
        'mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors',
        isOptimalCombo
          ? 'border-primary/40 bg-primary/8'
          : 'border-border bg-muted/40'
      )}>
        <HugeiconsIcon
          icon={isOptimalCombo ? SparklesIcon : InformationCircleIcon}
          size={13}
          className={cn('mt-0.5 flex-shrink-0', isOptimalCombo ? 'text-primary' : 'text-muted-foreground')}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isOptimalCombo ? (
            <span>
              <span className="font-semibold text-primary">Optimal TikTok settings.</span>{' '}
              1080×1920 portrait at 60 fps with maximum quality — Cloudinary re-encodes on their servers.
              Your video will look as sharp as possible after TikTok's compression.
            </span>
          ) : (
            <span>
              Output will be{' '}
              <span className="font-medium text-foreground">
                {RESOLUTIONS.find((r) => r.value === resolution)?.sublabel ?? 'original size'}
              </span>{' '}
              at <span className="font-medium text-foreground">{fps} fps</span>{' '}
              · <span className="font-medium text-foreground">{QUALITY_PRESETS[qualityIdx].label}</span>{' '}
              quality ({QUALITY_PRESETS[qualityIdx].bitrate}) · H.264 + AAC 192 kbps.
            </span>
          )}
        </p>
      </div>

      {/* ── Action ── */}
      <div className="mt-5 pb-2">
        <Button
          id="optimize-upload-btn"
          className="w-full gap-2 h-10 text-sm font-medium"
          disabled={!selectedFile || uploading}
          onClick={handleSubmit}
        >
          <HugeiconsIcon icon={uploading ? CloudUploadIcon : CloudUploadIcon} size={16} />
          {uploading ? 'Optimizing & uploading…' : 'Optimize & Upload to Cloudinary'}
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Re-encoded by Cloudinary · Saved to Firestore · No local backend needed
        </p>
      </div>
    </div>
  )
}
