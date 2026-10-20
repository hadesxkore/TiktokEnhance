import { NavLink } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Upload01Icon,
  VideoIcon,
  HistoryIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',        label: 'Upload',   icon: Upload01Icon, end: true },
  { to: '/videos',  label: 'Videos',   icon: VideoIcon },
  { to: '/history', label: 'History',  icon: HistoryIcon },
]

/* ── Desktop sidebar ────────────────────────────────────────── */
export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-52 flex-shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">ClearCut</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )
            }
          >
            <HugeiconsIcon icon={icon} size={15} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Optimized via Cloudinary<br />Stored in Firestore
        </p>
      </div>
    </aside>
  )
}

/* ── Mobile bottom nav ──────────────────────────────────────── */
export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-border bg-card/95 backdrop-blur-sm">
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  isActive ? 'bg-primary/15' : ''
                )}
              >
                <HugeiconsIcon icon={icon} size={16} />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
