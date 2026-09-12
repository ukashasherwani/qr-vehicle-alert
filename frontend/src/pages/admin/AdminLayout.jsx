import { UserButton, useUser } from '@clerk/clerk-react'
import {
  BarChart3,
  Car,
  Bell,
  MessageSquare,
  Shield,
  Users,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

const NAV_ITEMS = [
  { name: 'Dashboard Overview', path: '/admin', icon: BarChart3, exact: true },
  { name: 'User Management', path: '/admin/users', icon: Users },
  { name: 'Vehicles & QR Codes', path: '/admin/vehicles', icon: Car },
  { name: 'SOS Emergency Logs', path: '/admin/sos-logs', icon: Bell },
  { name: 'Message Moderation', path: '/admin/messages', icon: MessageSquare },
]

export default function AdminLayout() {
  const { user } = useUser()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = (
    <nav className="flex-1 space-y-1.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`group flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'border-white/15 bg-white/10 text-white'
                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span>{item.name}</span>
            </div>
            {isActive && <ChevronRight className="h-4 w-4 text-white" />}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="admin-shell flex min-h-screen min-w-0 bg-[#0a0a0c] font-sans text-white">
      {/* Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#121215] md:sticky md:top-0 md:flex">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">QR Alert Admin</h1>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Control Center</span>
          </div>
        </div>

        {navigation}

        {/* Footer / Quick Links */}
        <div className="border-t border-white/10 p-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <span>Open Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#121215] px-4 md:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open admin navigation"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="mr-2 rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10 md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="text-xs font-medium text-slate-400">Portal /</span>
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {location.pathname.replace('/admin', '').replace('/', '') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{user?.fullName || 'Administrator'}</p>
              <p className="text-[10px] font-medium text-slate-400">Super Admin</p>
            </div>
            <UserButton afterSignOutUrl="/admin/login" />
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="w-full min-w-0 max-w-full flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#121215] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
              <span className="text-sm font-bold text-white">Admin navigation</span>
              <button type="button" aria-label="Close admin navigation" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}
    </div>
  )
}
