import { useEffect, useRef, useState } from 'react'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { BellRing, QrCode } from 'lucide-react'
import { io } from 'socket.io-client'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { apiUrl, BACKEND_URL } from '../api/config'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const middleNavRef = useRef(null)
  const mobileMiddleNavRef = useRef(null)
  const [middleNavWidth, setMiddleNavWidth] = useState(0)
  const [mobileMiddleNavWidth, setMobileMiddleNavWidth] = useState(0)
  const { theme } = useTheme()
  const { openSignIn, openSignUp } = useClerk()
  const { isLoaded, isSignedIn, user } = useUser()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const isDark = theme === 'dark'
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      setAlerts([])
      return undefined
    }

    let isMounted = true
    fetch(apiUrl(`/alerts/owner/${encodeURIComponent(user.id)}`))
      .then((response) => (response.ok ? response.json() : []))
      .then((ownerAlerts) => {
        if (isMounted) setAlerts(Array.isArray(ownerAlerts) ? ownerAlerts : [])
      })
      .catch(() => {})

    const socket = io(BACKEND_URL)
    const belongsToOwner = (alert, ownerId = user.id) => (
      alert?.vehicleId?.ownerClerkId === ownerId
    )
    const addAlert = (alert) => {
      if (!belongsToOwner(alert)) return
      setAlerts((currentAlerts) => (
        currentAlerts.some((currentAlert) => currentAlert._id === alert._id)
          ? currentAlerts
          : [alert, ...currentAlerts]
      ))
    }
    const updateAlert = ({ alert }) => {
      if (!belongsToOwner(alert)) return
      setAlerts((currentAlerts) => currentAlerts.map((currentAlert) => (
        currentAlert._id === alert._id ? { ...currentAlert, ...alert } : currentAlert
      )))
    }

    socket.on('newAlert', ({ alert, vehicleOwnerClerkId }) => {
      if (vehicleOwnerClerkId === user.id) addAlert(alert)
    })
    socket.on('sosEmergencyAlert', ({ alert }) => addAlert(alert))
    socket.on('alertUpdated', updateAlert)
    socket.on('alertStatusChanged', updateAlert)
    socket.on('sosAlertUpdated', updateAlert)

    return () => {
      isMounted = false
      socket.disconnect()
    }
  }, [isLoaded, isSignedIn, user])

  const pendingAlerts = alerts.filter((alert) => !['resolved', 'dismissed'].includes(alert.status))
  const hasHighUrgencyAlert = pendingAlerts.some((alert) => (
    alert.urgency === 'high' || alert.alertType === 'CRITICAL_SOS'
  ))

  const publicAuthAppearance = {
    variables: {
      colorPrimary: '#000000',
      colorBackground: '#181818',
      colorText: '#E8E8E8',
      colorTextSecondary: '#B8B8B8',
      colorInputBackground: '#000000',
      colorInputText: '#E8E8E8',
      colorNeutral: '#B8B8B8',
      borderRadius: '0.75rem',
    },
    elements: {
      modalBackdrop: 'bg-black/75 backdrop-blur-none',
      modalContent: 'bg-[#181818] border border-[#888888] shadow-2xl',
      card: 'bg-[#181818] border border-[#888888] shadow-2xl',
      headerTitle: 'text-[#E8E8E8]',
      headerSubtitle: 'text-[#B8B8B8]',
      formFieldLabel: 'text-[#E8E8E8]',
      formFieldInput: 'bg-black border-[#888888] text-[#E8E8E8]',
      formButtonPrimary: 'bg-[#E8E8E8] text-black hover:bg-white',
      footer: 'bg-[#181818] border-t border-[#484848]',
      footerActionText: 'text-[#B8B8B8]',
      footerActionLink: 'text-[#E8E8E8] hover:text-white',
    },
  }

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

  useEffect(() => {
    const element = middleNavRef.current
    if (!element) return undefined

    const updateWidth = () => setMiddleNavWidth(element.scrollWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = mobileMiddleNavRef.current
    if (!element) return undefined

    const updateWidth = () => setMobileMiddleNavWidth(element.scrollWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
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
      className={`fixed z-50 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isScrolled
          ? 'top-3 sm:top-4 left-0 right-0 mx-auto w-[calc(100%-1.75rem)] sm:w-[calc(100%-3rem)] max-w-6xl rounded-2xl bg-white/35 dark:bg-neutral-900/40 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.15)] px-4 sm:px-6 py-2.5'
          : 'top-0 left-0 right-0 w-full rounded-none bg-white/20 dark:bg-neutral-900/30 backdrop-blur-2xl px-5 sm:px-8 py-4'
        }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 font-bold tracking-tight text-neutral-900 dark:text-white no-underline transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm transition duration-300 group-hover:scale-105 group-hover:bg-neutral-700 dark:group-hover:bg-neutral-200">
              <QrCode size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-white transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                QR Vehicle <span className="text-neutral-600 dark:text-neutral-600">Alert</span>
              </span>
              <span className="hidden text-[10px] font-semibold tracking-wider text-neutral-600 dark:text-neutral-600 sm:inline-block uppercase">
                Privacy-First Contact
              </span>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `relative inline-flex items-center whitespace-nowrap select-none text-sm font-medium transition-all ${isActive ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:font-semibold'}`
              }
            >
              {({ isActive }) => (
                <>
                  Home
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: '-4px',
                        zIndex: 10,
                        display: 'block',
                        height: '2px',
                        backgroundColor: 'currentColor',
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  )}
                </>
              )}
            </NavLink>

            <motion.div
              ref={middleNavRef}
              className="flex shrink-0 items-center gap-6 overflow-visible whitespace-nowrap select-none"
              initial={false}
              animate={{
                clipPath: isHomePage ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
                marginRight: isHomePage ? 0 : -(middleNavWidth + 24),
              }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              aria-hidden={!isHomePage}
            >
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="whitespace-nowrap select-none text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-all hover:text-neutral-900 dark:hover:text-white hover:font-semibold cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="whitespace-nowrap select-none text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-all hover:text-neutral-900 dark:hover:text-white hover:font-semibold cursor-pointer"
              >
                How It Works
              </button>
            </motion.div>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `relative inline-flex items-center whitespace-nowrap select-none text-sm font-medium transition-all ${isActive ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:font-semibold'}`
              }
            >
              {({ isActive }) => (
                <>
                  Owner Portal
                  {isActive ? (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: '-4px',
                        zIndex: 10,
                        display: 'block',
                        height: '2px',
                        backgroundColor: 'currentColor',
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Right Section: Auth & Action Buttons */}
        <div className="flex items-center gap-3">
          {isSignedIn && pendingAlerts.length > 0 && (
            <NavLink
              to="/dashboard#alerts-section"
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition hover:scale-105 ${hasHighUrgencyAlert
                ? 'border-red-500/60 bg-red-500/10 text-red-500'
                : 'border-neutral-300 bg-white/70 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-200'
                }`}
              title="Open pending vehicle alerts"
              aria-label={`${pendingAlerts.length} pending vehicle alert${pendingAlerts.length === 1 ? '' : 's'}`}
            >
              <BellRing size={18} className="animate-pulse" />
              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingAlerts.length}
              </span>
            </NavLink>
          )}
          <SignedOut>
            <button
              className="btn-secondary !h-9 sm:!h-10 !px-3.5 sm:!px-4 !text-xs sm:!text-sm !rounded-xl"
              type="button"
              onClick={() => openSignIn({ appearance: publicAuthAppearance })}
            >
              Sign In
            </button>
            <button
              className="btn-primary !h-9 sm:!h-10 !px-3.5 sm:!px-4 !text-xs sm:!text-sm !rounded-xl"
              type="button"
              onClick={() => openSignUp({ appearance: publicAuthAppearance })}
            >
              Sign Up
            </button>
          </SignedOut>

          <SignedIn>
            <ThemeToggle variant="inline" />
            <div className={`flex items-center rounded-xl p-1 shadow-sm transition-colors ${isDark
                ? 'border border-neutral-800 bg-neutral-900 hover:bg-neutral-800'
                : 'border border-neutral-200 bg-white hover:bg-neutral-100'
              }`}>
              <UserButton
                appearance={{
                  variables: {
                    colorBackground: 'var(--bg-card)',
                    colorText: 'var(--text-primary)',
                    colorTextSecondary: 'var(--text-body)',
                    colorInputBackground: 'var(--bg-card-inner)',
                    colorInputText: 'var(--text-primary)',
                    colorNeutral: 'var(--text-body)',
                  },
                  elements: {
                    userButtonPopoverCard: {
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-divider)',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
                    },
                    userButtonPopoverActionButton: {
                      color: 'var(--text-primary)',
                    },
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>
      </div>

      <nav className="mt-3 flex items-center gap-5 overflow-x-auto border-t border-neutral-300/60 pb-1 pt-3 dark:border-neutral-700/60 md:hidden" aria-label="Mobile navigation">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `relative shrink-0 whitespace-nowrap select-none text-xs font-medium transition-all ${isActive ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:font-semibold hover:text-neutral-900 dark:hover:text-white'}`
          }
        >
          {({ isActive }) => (
            <>
              Home
              {isActive && (
                <motion.span
                  layoutId="mobileActiveNavIndicator"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-current"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              )}
            </>
          )}
        </NavLink>

        <motion.div
          ref={mobileMiddleNavRef}
          className="flex shrink-0 items-center gap-5"
          initial={false}
          animate={{
            clipPath: isHomePage ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
            marginRight: isHomePage ? 0 : -(mobileMiddleNavWidth + 20),
          }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden={!isHomePage}
        >
          <button type="button" onClick={() => scrollToSection('features')} className="shrink-0 whitespace-nowrap select-none text-xs font-medium text-neutral-600 transition-all hover:font-semibold hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            Features
          </button>
          <button type="button" onClick={() => scrollToSection('about')} className="shrink-0 whitespace-nowrap select-none text-xs font-medium text-neutral-600 transition-all hover:font-semibold hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            How It Works
          </button>
        </motion.div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `relative shrink-0 whitespace-nowrap select-none text-xs font-medium transition-all ${isActive ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:font-semibold hover:text-neutral-900 dark:hover:text-white'}`
          }
        >
          {({ isActive }) => (
            <>
              Owner Portal
              {isActive && (
                <motion.span
                  layoutId="mobileActiveNavIndicator"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-current"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              )}
            </>
          )}
        </NavLink>
      </nav>
    </header>
  )
}

export default Header
