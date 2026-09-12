import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { NavLink } from 'react-router-dom'

function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex min-h-16 flex-col justify-between gap-4 border-b border-white/10 bg-black/40 px-5 py-4 text-white backdrop-blur-md sm:flex-row sm:items-center sm:px-8">
      {/* Left Section: Logo + Navigation Links */}
      <div className="flex items-center gap-6">
        <NavLink className="font-bold tracking-tight text-white no-underline" to="/">
          QR Vehicle Alert
        </NavLink>

        <nav className="flex items-center gap-4" aria-label="Primary navigation">
          <NavLink className="text-sm text-white/60 no-underline transition hover:text-white" to="/">Home</NavLink>
          <NavLink className="text-sm text-white/60 no-underline transition hover:text-white" to="/dashboard">Owner Portal</NavLink>
        </nav>
      </div>

      {/* Right Section: Auth Buttons */}
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/85" type="button">Sign up</button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}

export default Header
