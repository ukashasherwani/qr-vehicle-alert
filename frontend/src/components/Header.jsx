import { useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { NavLink, useLocation } from 'react-router-dom'
import { QrCode, Sparkles } from 'lucide-react'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 25) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    if (isHomePage) {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <header
      className={`fixed z-50 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
        isScrolled
          ? 'top-3 sm:top-4 left-0 right-0 mx-auto w-[calc(100%-1.75rem)] sm:w-[calc(100%-3rem)] max-w-6xl rounded-2xl bg-[#E8E8E8]/95 backdrop-blur-xl border border-[#888888]/40 shadow-[0_12px_36px_rgba(0,0,0,0.1)] px-4 sm:px-6 py-2.5'
          : 'top-0 left-0 right-0 w-full rounded-none bg-[#E8E8E8] backdrop-blur-md border-b border-[#888888]/30 px-5 sm:px-8 py-4'
      }`}
      style={{ backgroundColor: isScrolled ? 'rgba(232, 232, 232, 0.95)' : '#E8E8E8' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 font-bold tracking-tight text-[#000000] no-underline transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#000000] text-[#E8E8E8] border border-[#888888]/40 shadow-sm transition duration-300 group-hover:scale-105 group-hover:bg-[#484848]">
              <QrCode size={20} className="text-[#E8E8E8]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-[#000000] transition-colors group-hover:text-[#484848]">
                QR Vehicle <span className="text-[#484848]">Alert</span>
              </span>
              <span className="hidden text-[10px] font-semibold tracking-wider text-[#484848]/80 sm:inline-block uppercase">
                Privacy-First Contact
              </span>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition-all ${
                  isActive
                    ? 'text-[#000000] font-bold border-b-2 border-[#000000] pb-0.5'
                    : 'text-[#484848] hover:text-[#000000] hover:font-semibold'
                }`
              }
            >
              Home
            </NavLink>

            {isHomePage ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="text-sm font-medium text-[#484848] transition-all hover:text-[#000000] hover:font-semibold cursor-pointer"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('about')}
                  className="text-sm font-medium text-[#484848] transition-all hover:text-[#000000] hover:font-semibold cursor-pointer"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('scanner-section')}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#484848] transition-all hover:text-[#000000] hover:font-semibold cursor-pointer"
                >
                  <Sparkles size={14} className="text-[#000000]" />
                  Live Scanner
                </button>
              </>
            ) : null}

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-all ${
                  isActive
                    ? 'text-[#000000] font-bold border-b-2 border-[#000000] pb-0.5'
                    : 'text-[#484848] hover:text-[#000000] hover:font-semibold'
                }`
              }
            >
              Owner Portal
            </NavLink>
          </nav>
        </div>

        {/* Right Section: Auth & Action Buttons */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="btn-secondary !h-9 sm:!h-10 !px-3.5 sm:!px-4 !text-xs sm:!text-sm !rounded-xl"
                type="button"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                className="btn-primary !h-9 sm:!h-10 !px-3.5 sm:!px-4 !text-xs sm:!text-sm !rounded-xl"
                type="button"
              >
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <NavLink
              to="/dashboard"
              className="hidden sm:inline-flex btn-secondary !h-9 sm:!h-10 !px-3.5 sm:!px-4 !text-xs sm:!text-sm !rounded-xl"
            >
              Dashboard
            </NavLink>
            <div className="flex items-center rounded-xl p-1 bg-[#B8B8B8] border border-[#888888]/40 shadow-sm">
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

export default Header
