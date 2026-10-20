import { useCallback, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useVideoProcessor } from '../hooks/useVideoProcessor'
import { useVideoStore } from '../store/videoStore'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Upload01Icon,
  VideoIcon,
  CloudUploadIcon,
  Tick01Icon,
  SparklesIcon,
  InformationCircleIcon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  Loading03Icon,
  Download01Icon,
} from '@hugeicons/core-free-icons'
import { getDownloadUrl } from '../lib/cloudinary'
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
  const { jobs }                          = useVideoStore()
  const [dragging, setDragging]           = useState(false)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [videoMeta, setVideoMeta]         = useState<VideoMeta | null>(null)
  const [resolution, setResolution]       = useState('1080x1920')
  const [qualityIdx, setQualityIdx]       = useState(0)
  const [fps, setFps]                     = useState(60)
  const [uploading, setUploading]         = useState(false)
  const [activeJobId, setActiveJobId]     = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Find currently active job from store
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const f = files[0]
    if (!f.type.startsWith('video/') && !f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)) {
      return
    }
    setSelectedFile(f)
    setVideoMeta(null)
    setActiveJobId(null)
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

  useEffect(() => {
    if (!selectedFile) setVideoMeta(null)
  }, [selectedFile])

  const handleSubmit = async () => {
    if (!selectedFile) return
    const q = QUALITY_PRESETS[qualityIdx]
    setUploading(true)
    try {
      const jobId = await process(selectedFile, {
        resolution,
        quality:      q.quality,
        qualityLabel: q.label,
        fps,
      })
      if (jobId) setActiveJobId(jobId)
    } finally {
      setUploading(false)
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const applyOptimalPreset = () => {
    setResolution('1080x1920')
    setQualityIdx(0)
    setFps(60)
  }

  const isOptimalCombo = resolution === '1080x1920' && qualityIdx === 0 && fps === 60

  // Calculate estimated original bitrate
  const estimatedBitrateMbps =
    selectedFile && videoMeta && videoMeta.duration > 0
      ? ((selectedFile.size * 8) / (videoMeta.duration * 1_000_000)).toFixed(1)
      : null

  const isLandscape = videoMeta && videoMeta.width > videoMeta.height
  const isPortrait = videoMeta && videoMeta.height > videoMeta.width
  const isAppleMov = selectedFile?.name.toLowerCase().endsWith('.mov') || selectedFile?.type.includes('quicktime')

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
          TikTok aggressively compresses raw videos. We pre-encode your video with
          exact bitrate, 60fps motion, and 9:16 vertical resolution to preserve crystal-clear sharpness.
        </p>
      </div>

      {/* ── Active Upload Progress Screen (Shows directly on this page!) ── */}
      {activeJob && activeJob.status === 'uploading' && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Processing Video for TikTok</p>
                <p className="text-[11px] text-muted-foreground truncate max-w-[220px] sm:max-w-xs">
                  {activeJob.filename} ({fmt(activeJob.originalSize)})
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-primary font-mono">{activeJob.progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(activeJob.progress, 5)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {activeJob.progress < 70
                ? '📤 Uploading video to Cloudinary...'
                : activeJob.progress < 100
                ? '⚡ Applying TikTok 60fps & bitrate enhancement...'
                : '💾 Finalizing and saving to history...'}
            </span>
            <span className="font-mono text-[10px]">{activeJob.progress}%</span>
          </div>
        </div>
      )}

      {/* ── Success Card (Shows right on Upload page when completed!) ── */}
      {activeJob && activeJob.status === 'done' && (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">Video Optimized Successfully!</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ready to post to TikTok without quality degradation.
                </p>
              </div>
            </div>
          </div>

          {activeJob.cloudinaryUrl && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                className="gap-2 text-xs flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                onClick={() => {
                  const downloadUrl = getDownloadUrl(activeJob.cloudinaryUrl!, `tiktok_${activeJob.filename}`)
                  const a = document.createElement('a')
                  a.href = downloadUrl
                  a.setAttribute('download', `tiktok_${activeJob.filename}`)
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }}
              >
                <HugeiconsIcon icon={Download01Icon} size={14} />
                Download Video
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs flex-1 font-medium"
                onClick={() => handleCopyUrl(activeJob.cloudinaryUrl!)}
              >
                <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Link to="/videos" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View in My Videos
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setActiveJobId(null)
                  setSelectedFile(null)
                }}
              >
                Upload Another
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Error Banner (Shows if upload or processing fails) ── */}
      {activeJob && activeJob.status === 'error' && (
        <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20 text-destructive flex-shrink-0 mt-0.5">
              <HugeiconsIcon icon={AlertCircleIcon} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-destructive">Upload / Optimization Failed</h3>
              <p className="text-[11px] text-destructive-foreground/90 mt-1 break-words font-mono bg-destructive/15 p-2 rounded border border-destructive/20">
                {activeJob.error || 'Network connection failed during upload.'}
              </p>
              <div className="mt-2.5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground/80">Tips to resolve:</p>
                <p>• If on mobile data, try connecting to Wi-Fi or check upload signal.</p>
                <p>• Ensure your video is under Cloudinary's free preset limit (~100MB).</p>
                <p>• iPhone 4K videos are often very large; try trimming or lowering camera resolution.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-destructive/40 text-destructive hover:bg-destructive/15"
                  onClick={handleSubmit}
                  disabled={uploading}
                >
                  Retry Upload
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-muted-foreground"
                  onClick={() => setActiveJobId(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {estimatedBitrateMbps && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-primary/80">
                    ~{estimatedBitrateMbps} Mbps
                  </span>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
                setActiveJobId(null)
              }}
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

      {/* ── Video Backend Setup & Diagnostics Inspector ── */}
      {selectedFile && (
        <div className="mt-5 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Video Backend & Setup Diagnostics
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {selectedFile.type || 'video/mp4'}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/60">
              <p className="text-[10px] text-muted-foreground">Original Dimensions</p>
              <p className="text-xs font-mono font-semibold text-foreground mt-0.5">
                {videoMeta?.width && videoMeta?.height ? `${videoMeta.width} × ${videoMeta.height}` : 'Reading…'}
              </p>
              <span className="text-[9px] text-muted-foreground/80">
                {isPortrait ? '9:16 Vertical' : isLandscape ? '16:9 Wide' : 'Custom ratio'}
              </span>
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/60">
              <p className="text-[10px] text-muted-foreground">File Size</p>
              <p className="text-xs font-mono font-semibold text-foreground mt-0.5">
                {fmt(selectedFile.size)}
              </p>
              <span className="text-[9px] text-muted-foreground/80">
                {selectedFile.size > 80 * 1024 * 1024 ? 'Large video' : 'Normal size'}
              </span>
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/60">
              <p className="text-[10px] text-muted-foreground">Estimated Bitrate</p>
              <p className="text-xs font-mono font-semibold text-foreground mt-0.5">
                {estimatedBitrateMbps ? `${estimatedBitrateMbps} Mbps` : 'Calculating…'}
              </p>
              <span className="text-[9px] text-muted-foreground/80">
                {Number(estimatedBitrateMbps) > 12 ? '⚠️ High (needs pre-encode)' : 'Good range'}
              </span>
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/60">
              <p className="text-[10px] text-muted-foreground">Container / Format</p>
              <p className="text-xs font-mono font-semibold text-foreground mt-0.5 truncate">
                {isAppleMov ? 'Apple QuickTime (.MOV)' : 'MPEG-4 (.MP4)'}
              </p>
              <span className="text-[9px] text-muted-foreground/80">
                {isAppleMov ? 'Needs MP4 re-mux' : 'Native Web'}
              </span>
            </div>
          </div>

          {/* TikTok Platform Assessment */}
          <div className="rounded-lg bg-muted/30 border border-border/80 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <span>🎯</span> TikTok Platform Assessment:
            </p>

            <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              {selectedFile.size > 90 * 1024 * 1024 && (
                <div className="flex items-start gap-1.5 text-amber-400/90 font-medium">
                  <span className="text-xs">⚠️</span>
                  <span>
                    <strong>File size near Cloudinary limit ({fmt(selectedFile.size)}):</strong> Cloudinary free plan has a 100MB upload limit. If your upload fails, try trimming or lowering your camera's recording resolution.
                  </span>
                </div>
              )}

              {isLandscape && (
                <div className="flex items-start gap-1.5 text-amber-400/90">
                  <span className="text-xs">⚠️</span>
                  <span>
                    <strong>Landscape video detected:</strong> TikTok's feed is vertical (9:16). Uploading this as-is will create black bars top and bottom. We strongly recommend setting Output Resolution to <strong>Portrait (1080×1920)</strong>.
                  </span>
                </div>
              )}

              {Number(estimatedBitrateMbps) > 12 && (
                <div className="flex items-start gap-1.5 text-amber-400/90">
                  <span className="text-xs">⚠️</span>
                  <span>
                    <strong>High bitrate detected (~{estimatedBitrateMbps} Mbps):</strong> TikTok compresses uploads down to ~6 Mbps with heavy lossy filters, which blurs high-motion footage. Our <strong>Maximum</strong> preset pre-encodes the stream cleanly on Cloudinary.
                  </span>
                </div>
              )}

              {isAppleMov && (
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <span className="text-xs">ℹ️</span>
                  <span>
                    <strong>Apple iPhone QuickTime format:</strong> Will be converted into universal web-optimized H.264 MP4 to eliminate stuttering on Android/web viewers.
                  </span>
                </div>
              )}

              {isPortrait && Number(estimatedBitrateMbps) <= 12 && !isAppleMov && (
                <div className="flex items-start gap-1.5 text-emerald-400">
                  <span className="text-xs">✅</span>
                  <span>
                    <strong>Native TikTok Portrait:</strong> Aspect ratio already matches TikTok's 9:16 viewport.
                  </span>
                </div>
              )}
            </div>

            {(!isOptimalCombo || isLandscape) && (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={applyOptimalPreset}
                >
                  <HugeiconsIcon icon={SparklesIcon} size={12} />
                  Auto-Apply Optimal TikTok Settings (1080×1920, 60fps, Max Quality)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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
          <HugeiconsIcon icon={CloudUploadIcon} size={16} />
          {uploading ? 'Optimizing & uploading…' : 'Optimize & Upload to Cloudinary'}
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Re-encoded by Cloudinary · Saved to Firestore · No local backend needed
        </p>
      </div>
    </div>
  )
}
