import { SignIn, useAuth, useUser } from '@clerk/clerk-react'
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Navigate } from 'react-router-dom'

/**
 * AdminLogin Component
 * Dedicated, isolated Admin Portal authentication page.
 */
export default function AdminLogin() {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { user } = useUser()

  // If already signed in as admin, redirect to admin dashboard
  if (isLoaded && isSignedIn && user?.publicMetadata?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0a0a0c] px-4 py-12 text-white sm:px-6 lg:px-8">
      {/* Background Glow Effect */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[400px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Admin Control Center
          </h2>
            <p className="mt-1 text-xs text-white/50">
            Secure QR Vehicle Alert Management Portal
          </p>
        </div>

        {/* If signed in as non-admin, notify user */}
        {isLoaded && isSignedIn && user?.publicMetadata?.role !== 'admin' && (
          <div className="mb-6 rounded-xl border border-white/15 bg-white/5 p-4 text-white/80">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-white" />
              <div className="text-xs">
                <p className="font-semibold text-white">Non-Admin Account Detected</p>
                <p className="mt-1">
                  You are signed in as <span className="font-medium">{user.primaryEmailAddress?.emailAddress}</span> which lacks admin permissions.
                </p>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="mt-2 text-xs font-semibold text-white underline hover:text-white/70"
                >
                  Sign out to switch to Admin account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clerk Sign-In Component Container */}
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/admin/login"
            fallbackRedirectUrl="/admin"
            appearance={{
              variables: {
                colorPrimary: '#ffffff',
                colorBackground: '#0f172a', // Slate 900
                colorText: '#f8fafc',
                colorTextSecondary: '#a1a1aa',
                colorInputBackground: '#020617', // Slate 950
                colorInputText: '#ffffff',
                borderRadius: '0.75rem',
              },
              elements: {
                card: 'border border-white/10 shadow-2xl bg-[#121215]',
                headerTitle: 'text-slate-100',
                headerSubtitle: 'text-slate-400',
                formButtonPrimary: 'bg-white hover:bg-white/85 text-black font-semibold',
                footerActionText: 'text-white/50',
                footerActionLink: 'text-white hover:text-white/70',
              },
            }}
          />
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Public Portal
          </a>
        </div>
      </div>
    </div>
  )
}
