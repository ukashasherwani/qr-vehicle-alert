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
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

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

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">QR Alert Admin</h1>
            <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">Control Center</span>
          </div>
        </div>

        {/* Navigation Items */}
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
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-cyan-400" />}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer / Quick Links */}
        <div className="border-t border-slate-800 p-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <span>Open Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Portal /</span>
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {location.pathname.replace('/admin', '').replace('/', '') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{user?.fullName || 'Administrator'}</p>
              <p className="text-[10px] text-cyan-400 font-medium">Super Admin</p>
            </div>
            <UserButton afterSignOutUrl="/admin/login" />
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
