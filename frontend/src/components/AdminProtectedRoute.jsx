import { useAuth, useUser } from '@clerk/clerk-react'
import { AlertOctagon, ArrowLeft, Loader2, LogOut } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * AdminProtectedRoute Component
 * Guards admin routes against unauthenticated users and non-admin accounts.
 *
 * Requirements:
 * - Not loaded -> Show spinner
 * - Not signed in -> Redirect to /admin/login
 * - Signed in but user.publicMetadata.role !== 'admin' -> Show Access Denied screen
 * - Signed in as admin -> Render children or <Outlet />
 */
export default function AdminProtectedRoute({ children }) {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { user } = useUser()

  // 1. Loading State
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm font-medium text-white/50">Verifying administrator credentials...</p>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated State -> Redirect to Admin Login
  if (!isSignedIn) {
    return <Navigate to="/admin/login" replace />
  }

  // 3. Authenticated but Unauthorized (Non-Admin User)
  const isAdmin = user?.publicMetadata?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4 py-12 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121215] p-8 shadow-2xl">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <AlertOctagon className="h-9 w-9" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">403 - Access Denied</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Your account (<span className="text-white">{user?.primaryEmailAddress?.emailAddress || user?.username}</span>) is authenticated, but does not possess the required administrator privileges (<code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">role: 'admin'</code>).
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/admin/login' })}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black shadow transition-all hover:bg-white/85"
            >
              <LogOut className="h-4 w-4" />
              Sign in with another account
            </button>

            <a
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to main website
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 4. Authorized Admin
  return children ? children : <Outlet />
}
