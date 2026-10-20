import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar, MobileNav } from './components/layout/Sidebar'
import { UploadPage } from './pages/UploadPage'
import { VideosPage } from './pages/VideosPage'
import { HistoryPage } from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar — hidden on mobile */}
        <Sidebar />

        {/* Page content — extra bottom padding on mobile for the fixed nav */}
        <main className="flex flex-1 flex-col overflow-y-auto pb-[68px] md:pb-0">
          <Routes>
            <Route path="/"        element={<UploadPage />} />
            <Route path="/videos"  element={<VideosPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>

        {/* Mobile bottom tab bar — hidden on desktop */}
        <MobileNav />
      </div>
    </BrowserRouter>
  )
}
