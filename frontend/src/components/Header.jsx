import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { NavLink } from 'react-router-dom'

function Header() {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-8">
      {/* Left Section: Logo + Navigation Links */}
      <div className="flex items-center gap-6">
        <NavLink className="font-bold text-slate-950 no-underline" to="/">
          QR Vehicle Alert
        </NavLink>

        <nav className="flex items-center gap-4" aria-label="Primary navigation">
          <NavLink className="text-slate-700 no-underline hover:text-cyan-700" to="/">Home</NavLink>
          <NavLink className="text-slate-700 no-underline hover:text-cyan-700" to="/dashboard">Owner Portal</NavLink>
        </nav>
      </div>

      {/* Right Section: Auth Buttons */}
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100" type="button">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800" type="button">Sign up</button>
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
