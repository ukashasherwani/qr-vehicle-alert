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
          ? 'top-3 sm:top-4 left-0 right-0 mx-auto w-[calc(100%-1.75rem)] sm:w-[calc(100%-3rem)] max-w-6xl rounded-2xl bg-[#1A0F0A]/95 backdrop-blur-xl border border-[#3A2316]/40 shadow-[0_16px_40px_rgba(26, 15, 10,0.35)] px-4 sm:px-6 py-2.5'
          : 'top-0 left-0 right-0 w-full rounded-none bg-[#1A0F0A] backdrop-blur-md border-b border-[#3A2316]/30 px-5 sm:px-8 py-4'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 font-bold tracking-tight text-white no-underline transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A68C7B] border border-[#3A2316]/60 shadow-[0_0_16px_rgba(58, 35, 22,0.4)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(244, 239, 234,0.6)]">
              <QrCode size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white transition-colors group-hover:text-white/95">
                QR Vehicle <span className="text-[#F4EFEA]">Alert</span>
              </span>
              <span className="hidden text-[10px] font-medium tracking-wider text-[#F4EFEA]/70 sm:inline-block uppercase">
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
                    ? 'text-white font-semibold drop-shadow-[0_0_8px_rgba(244, 239, 234,0.5)]'
                    : 'text-[#F4EFEA] hover:text-white hover:drop-shadow-[0_0_8px_rgba(244, 239, 234,0.4)]'
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
                  className="text-sm font-medium text-[#F4EFEA] transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(244, 239, 234,0.4)] cursor-pointer"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('about')}
                  className="text-sm font-medium text-[#F4EFEA] transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(244, 239, 234,0.4)] cursor-pointer"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('scanner-section')}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#F4EFEA] transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(244, 239, 234,0.6)] cursor-pointer"
                >
                  <Sparkles size={14} />
                  Live Scanner
                </button>
              </>
            ) : null}

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white font-semibold drop-shadow-[0_0_8px_rgba(244, 239, 234,0.5)]'
                    : 'text-[#F4EFEA] hover:text-white hover:drop-shadow-[0_0_8px_rgba(244, 239, 234,0.4)]'
                }`
              }
            >
              Owner Portal
            </NavLink>
          </nav>
        </div>

        {/* Right Section: Auth & Action Buttons (Standardized) */}
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
            <div className="flex items-center rounded-xl p-1 bg-[#A68C7B] border border-[#3A2316]/30">
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

export default Header
