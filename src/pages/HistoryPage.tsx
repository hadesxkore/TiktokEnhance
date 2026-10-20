import { HugeiconsIcon } from '@hugeicons/react'
import { Download01Icon, HistoryIcon } from '@hugeicons/core-free-icons'
import { useVideoStore } from '../store/videoStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { VideoJob } from '../store/videoStore'

function fmt(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeProps(status: VideoJob['status']) {
  const map: Record<VideoJob['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    idle:      { label: 'Idle',      variant: 'outline' },
    uploading: { label: 'Uploading', variant: 'secondary' },
    done:      { label: 'Done',      variant: 'default' },
    error:     { label: 'Error',     variant: 'destructive' },
  }
  return map[status] ?? { label: status, variant: 'outline' }
}

export function HistoryPage() {
  const jobs     = useVideoStore((s) => s.jobs)
  const clearJob = useVideoStore((s) => s.clearJob)
  const sorted   = [...jobs].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="flex flex-col min-h-full px-4 py-6 sm:px-8 sm:py-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-xs text-muted-foreground">All videos processed this session</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <HugeiconsIcon icon={HistoryIcon} size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No history yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Uploaded videos will appear here</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((job) => {
                const { label, variant } = statusBadgeProps(job.status)
                return (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[140px] sm:max-w-[200px]">
                      <p className="truncate text-xs font-medium">{job.filename}</p>
                      <p className="text-[10px] text-muted-foreground sm:hidden">{fmtDate(job.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {job.resolution ? (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {job.resolution.replace('x', '×')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Original</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{job.qualityLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(job.originalSize)}
                      {job.processedSize && (
                        <span className="text-primary font-medium"> → {fmt(job.processedSize)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant}>{label}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {job.cloudinaryUrl && (
                          <a href={job.cloudinaryUrl} download id={`history-dl-${job.id}`}>
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                              <HugeiconsIcon icon={Download01Icon} size={11} />
                            </Button>
                          </a>
                        )}
                        <Button
                          id={`history-rm-${job.id}`}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground"
                          onClick={() => clearJob(job.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
