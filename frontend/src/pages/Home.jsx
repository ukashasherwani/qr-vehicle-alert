import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BellRing,
  Camera,
  Car,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Lock,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'

const SCANNER_ID = 'vehicle-qr-reader'

function getVehiclePath(decodedText) {
  try {
    const decodedUrl = new URL(decodedText, window.location.origin)

    if (decodedUrl.origin !== window.location.origin) {
      return null
    }

    const match = decodedUrl.pathname.match(/^\/scan\/([^/]+)\/?$/)
    return match ? `/scan/${match[1]}` : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Custom hook: IntersectionObserver for scroll-entrance animations    */
/* Adds .is-visible to every .observe-fade element as it enters view   */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target) // fire once only
          }
        })
      },
      { threshold: 0.12 },
    )

    const targets = document.querySelectorAll('.observe-fade')
    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}

/* ------------------------------------------------------------------ */
/* Horizontal continuous ticker items (stat highlights)                */
/* ------------------------------------------------------------------ */
const TICKER_ITEMS = [
  { icon: <ShieldCheck size={14} className="text-[#F4EFEA]" />, label: '100% Anonymous' },
  { icon: <Zap size={14} className="text-[#F4EFEA]" />, label: '< 2s Alert Delivery' },
  { icon: <Smartphone size={14} className="text-[#F4EFEA]" />, label: 'No App Required' },
  { icon: <Lock size={14} className="text-[#F4EFEA]" />, label: 'End-to-End Encrypted' },
  { icon: <BellRing size={14} className="text-[#F4EFEA]" />, label: 'Real-Time Notifications' },
  { icon: <Car size={14} className="text-[#F4EFEA]" />, label: 'Works on Any Vehicle' },
  { icon: <ScanLine size={14} className="text-[#F4EFEA]" />, label: 'Instant QR Scan' },
  { icon: <ShieldAlert size={14} className="text-[#F4EFEA]" />, label: 'Emergency SOS Escalation' },
]

/* ------------------------------------------------------------------ */
/* Feature cards for rightward continuous horizontal motion marquee    */
/* ------------------------------------------------------------------ */
const FEATURE_CARDS = [
  {
    icon: <BellRing size={22} />,
    title: 'Instant Incident Alerts',
    description: 'Notify owners about lights left on, windows rolled down, open trunks, or flat tires within seconds.',
  },
  {
    icon: <Car size={22} />,
    title: 'Path & Driveway Clearing',
    description: 'Solve blocked parking spaces and double-parking friction amicably without expensive towing or disputes.',
  },
  {
    icon: <Siren size={22} />,
    title: 'Urgent SOS Broadcasts',
    description: 'High-priority emergency escalation alerts with loud push notifications and immediate delivery guarantees.',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'Zero Phone Exposure',
    description: "Total anonymity. Passersby never see the driver's phone number, name, or private contact details.",
  },
]

function Home() {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const hasScannedRef = useRef(false)
  const [scanError, setScanError] = useState('')
  const [hasScanned, setHasScanned] = useState(false)

  /* Scroll-reveal IntersectionObserver */
  useScrollReveal()

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      SCANNER_ID,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false,
    )
    scannerRef.current = scanner

    scanner.render(
      (decodedText) => {
        const vehiclePath = getVehiclePath(decodedText)

        if (!vehiclePath) {
          setScanError('That QR code is not a QR Vehicle Alert code.')
          return
        }

        if (hasScannedRef.current) return

        hasScannedRef.current = true
        setHasScanned(true)
        setScanError('')
        scanner.clear().catch(() => {})
        navigate(vehiclePath)
      },
      () => {
        // The scanner reports this while it is searching; no UI error is needed.
      },
    )

    return () => {
      scanner.clear().catch(() => {})
      scannerRef.current = null
    }
  }, [navigate])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="relative min-h-screen bg-[#5B3B2A] text-white selection:bg-[#1A0F0A] selection:text-white">
      {/* Background Ambient Glow Lights (Blue Eclipse on #5B3B2A) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(26, 15, 10,0.3)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(58, 35, 22,0.25)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(244, 239, 234,0.15)_0%,transparent_70%)] blur-3xl" />
      </div>

      <main className="relative z-10">
        {/* ============================================================ */}
        {/* HERO SECTION                                                 */}
        {/* ============================================================ */}
        <section
          id="hero"
          className="relative px-[var(--container-px)] pt-6 pb-14 sm:pb-20"
          style={{ paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)' }}
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(1536px, 100%)' }}
          >
            <div className="grid items-center gap-8 lg:gap-12"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
              }}
            >
              {/* Left Column: Hero Text & Standardized Buttons */}
              <div className="observe-fade fade-left flex flex-col items-start">
                {/* Main Headline */}
                <h1
                  className="mt-4 font-extrabold tracking-tight text-white leading-[1.12]"
                  style={{ fontSize: 'var(--text-hero)' }}
                >
                  Scan a vehicle.{' '}
                  <span className="text-[#F4EFEA] drop-shadow-[0_0_20px_rgba(244, 239, 234,0.35)]">
                    Send the right alert.
                  </span>{' '}
                  Zero privacy loss.
                </h1>

                {/* Subtext */}
                <p
                  className="mt-4 max-w-xl leading-relaxed text-[#F4EFEA]"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  Reach vehicle owners immediately for blocked driveways, headlight warnings, or
                  parking issues without ever exposing personal phone numbers or downloading an app.
                </p>

                {/* Standardized Primary & Secondary CTA Buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection('scanner-section')}
                    className="btn-primary"
                  >
                    <ScanLine size={18} />
                    <span>Scan Vehicle QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="btn-secondary"
                  >
                    <span>Explore Features</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Live Feature Badges */}
                <div className="mt-8 grid grid-cols-3 gap-2 border-t border-[#F4EFEA]/30 pt-6 w-full max-w-md">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <ShieldCheck size={15} className="text-[#F4EFEA]" />
                      <span>100%</span>
                    </div>
                    <span className="text-xs text-[#F4EFEA]/80">Anonymous</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Zap size={15} className="text-[#F4EFEA]" />
                      <span>&lt; 2s</span>
                    </div>
                    <span className="text-xs text-[#F4EFEA]/80">Delivery</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Smartphone size={15} className="text-[#F4EFEA]" />
                      <span>No App</span>
                    </div>
                    <span className="text-xs text-[#F4EFEA]/80">Required</span>
                  </div>
                </div>
              </div>

              {/* Right Column: High-Impact QR Scanner Card */}
              <div id="scanner-section" className="observe-fade delay-2">
                <div className="relative rounded-3xl border border-[#3A2316]/40 bg-[#1A0F0A] p-4 sm:p-6 shadow-[0_24px_60px_rgba(26, 15, 10,0.4),0_0_30px_rgba(58, 35, 22,0.2)] glass-card-interactive">

                  {/* Glowing Corner Accents (Blue Eclipse) */}
                  <div className="absolute top-3 left-3 h-3 w-3 border-t-2 border-l-2 border-[#F4EFEA]" />
                  <div className="absolute top-3 right-3 h-3 w-3 border-t-2 border-r-2 border-[#F4EFEA]" />
                  <div className="absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-[#F4EFEA]" />
                  <div className="absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-[#F4EFEA]" />

                  {/* Card Header */}
                  <div className="mb-4 flex items-center justify-between border-b border-[#3A2316]/30 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A68C7B] text-white border border-[#3A2316]/60 shadow-[0_0_15px_rgba(58, 35, 22,0.35)]">
                        <Camera size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Live Vehicle QR Scanner</h2>
                        <p className="text-xs text-[#F4EFEA]">Align camera with the vehicle's QR decal</p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#A68C7B] px-2.5 py-1 text-[11px] font-semibold text-[#F4EFEA] border border-[#3A2316]/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F4EFEA] animate-pulse" />
                      Ready
                    </div>
                  </div>

                  {/* html5-qrcode Render Target */}
                  <div className="relative overflow-hidden rounded-2xl border border-[#3A2316]/30 bg-[#A68C7B] p-2">
                    <div id={SCANNER_ID} className="w-full overflow-hidden rounded-xl" />
                  </div>

                  {/* Scanner Status Messages */}
                  {hasScanned && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-400">
                      <LoaderCircle className="animate-spin" size={18} />
                      <span>QR Recognized! Opening vehicle alert portal...</span>
                    </div>
                  )}

                  {scanError && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#3A2316]/50 bg-[#A68C7B] p-3 text-xs text-[#F4EFEA]">
                      <CircleAlert className="mt-0.5 shrink-0 text-[#F4EFEA]" size={16} />
                      <span>{scanError}</span>
                    </div>
                  )}

                  {/* Scanner Guidance Footer */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#F4EFEA]/70">
                    <span className="flex items-center gap-1">
                      <Lock size={12} className="text-[#F4EFEA]" /> Secure client-side scan
                    </span>
                    <span>Direct redirection</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* HORIZONTAL TICKER STRIP                                      */}
        {/* ============================================================ */}
        <div className="relative border-t border-b border-[#3A2316]/30 bg-[#1A0F0A] py-3 overflow-hidden">
          <div className="ticker-strip">
            <div className="ticker-track">
              {/* Render items twice for seamless infinite loop */}
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                /* eslint-disable-next-line react/no-array-index-key */
                <span key={i} className="ticker-item">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FEATURES / HIGHLIGHTS SECTION                                */}
        {/* ============================================================ */}
        <section id="features" className="relative border-t border-[#3A2316]/30 bg-[#5B3B2A] overflow-hidden"
          style={{ paddingTop: 'var(--section-py)', paddingBottom: 'var(--section-py)' }}
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(1536px, 100%)', paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)' }}
          >

            {/* Section Header */}
            <div className="observe-fade text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3A2316]/40 bg-[#1A0F0A] px-3.5 py-1 text-xs font-semibold text-[#F4EFEA]">
                <Sparkles size={14} />
                <span>INTELLIGENT ALERT PLATFORM</span>
              </div>
              <h2
                className="mt-4 font-extrabold tracking-tight text-white"
                style={{ fontSize: 'var(--text-h2)' }}
              >
                Engineered for Speed, Built for{' '}
                <span className="text-[#F4EFEA]">Driver Privacy</span>
              </h2>
              <p
                className="mt-3 text-[#F4EFEA]"
                style={{ fontSize: 'var(--text-body)' }}
              >
                No phone numbers on dashboards. No unwanted calls. Instant, encrypted alerts whenever you need them.
              </p>
            </div>
          </div>

          {/* Feature Cards — Rightward Horizontal Continuous Motion Ticker */}
          <div className="mt-8 ticker-strip py-4">
            <div className="ticker-track-right">
              {[...FEATURE_CARDS, ...FEATURE_CARDS, ...FEATURE_CARDS, ...FEATURE_CARDS].map((feature, idx) => (
                <div
                  key={`${feature.title}-${idx}`}
                  className="feature-ticker-card group flex flex-col justify-between bg-[#1A0F0A] border border-[#3A2316]/35 hover:border-[#F4EFEA]"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A68C7B] border border-[#3A2316]/40 text-[#F4EFEA] shadow-[0_0_15px_rgba(58, 35, 22,0.25)] transition duration-300 group-hover:scale-110 group-hover:border-[#F4EFEA] group-hover:text-white">
                      {feature.icon}
                    </div>
                    <h3 className="mt-4 text-base font-bold text-white transition-colors group-hover:text-[#F4EFEA]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#F4EFEA]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* ABOUT / INFO SECTION (Dual-Column Modern Layout)             */}
        {/* ============================================================ */}
        <section
          id="about"
          className="relative bg-[#5B3B2A] border-t border-[#3A2316]/30"
          style={{ paddingTop: 'var(--section-py)', paddingBottom: 'var(--section-py)' }}
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(1536px, 100%)', paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)' }}
          >
            <div
              className="grid items-center"
              style={{
                gap: 'clamp(2rem, 4vw, 3.5rem)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
              }}
            >

              {/* Left Column: Step-by-Step Interactive Workflow */}
              <div className="observe-fade fade-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3A2316]/40 bg-[#1A0F0A] px-3.5 py-1 text-xs font-semibold text-[#F4EFEA]">
                  <ScanLine size={14} className="text-[#F4EFEA]" />
                  <span>3-STEP EFFORTLESS WORKFLOW</span>
                </div>
                <h2
                  className="mt-4 font-extrabold tracking-tight text-white"
                  style={{ fontSize: 'var(--text-h2)' }}
                >
                  How QR Vehicle Alert Protects Drivers in Seconds
                </h2>
                <p
                  className="mt-3 leading-relaxed text-[#F4EFEA]"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  Traditional business cards or phone numbers written on windshields expose you to scams and stalking. Our encrypted dynamic QR codes bridge communication effortlessly.
                </p>

                {/* Workflow Steps */}
                <div className="mt-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>

                  {/* Step 1 */}
                  <div className="observe-fade delay-1 flex items-start gap-4 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] p-4 transition duration-300 hover:border-[#F4EFEA] hover:-translate-y-1 card-hover-glow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A68C7B] border border-[#3A2316]/50 text-sm font-bold text-white shadow-[0_0_12px_rgba(58, 35, 22,0.3)]">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Scan the Vehicle QR Decal</h4>
                      <p className="mt-1 text-sm text-[#F4EFEA]">
                        Passersby point their native smartphone camera at the sticker on the windshield. No app installation or sign-in needed.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="observe-fade delay-2 flex items-start gap-4 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] p-4 transition duration-300 hover:border-[#F4EFEA] hover:-translate-y-1 card-hover-glow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3A2316] text-sm font-bold text-white shadow-[0_0_12px_rgba(58, 35, 22,0.3)]">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Select Alert or Emergency SOS</h4>
                      <p className="mt-1 text-sm text-[#F4EFEA]">
                        Pick from pre-set scenarios (Blocked Path, Lights On, Alarm Sounding) or dispatch an instant custom message.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="observe-fade delay-3 flex items-start gap-4 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] p-4 transition duration-300 hover:border-[#F4EFEA] hover:-translate-y-1 card-hover-glow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A68C7B] border border-[#3A2316]/50 text-sm font-bold text-white shadow-[0_0_12px_rgba(58, 35, 22,0.3)]">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Owner Notified Instantly</h4>
                      <p className="mt-1 text-sm text-[#F4EFEA]">
                        The vehicle owner receives immediate real-time notifications, keeping everyone's personal identity completely confidential.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Comparison Card */}
              <div className="observe-fade delay-2 rounded-3xl border border-[#3A2316]/40 bg-[#1A0F0A] shadow-[0_20px_50px_rgba(26, 15, 10,0.35)] glass-card-interactive"
                style={{ padding: 'var(--card-padding)' }}
              >
                <div className="border-b border-[#3A2316]/30 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F4EFEA]">
                    SECURITY & PRIVACY BENCHMARK
                  </span>
                  <h3
                    className="mt-1 font-bold text-white"
                    style={{ fontSize: 'var(--text-h3)' }}
                  >
                    Paper Phone Card vs. QR Vehicle Alert
                  </h3>
                </div>

                <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>

                  {/* Item 1 */}
                  <div className="rounded-xl border border-rose-500/20 bg-[#A68C7B] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <XCircle size={15} /> Handwritten Phone Numbers
                    </div>
                    <p className="mt-1 text-xs text-[#F4EFEA]">
                      Exposes personal numbers to strangers, spam callers, telemarketers, and potential harassment.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="rounded-xl border border-emerald-500/20 bg-[#A68C7B] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 size={15} /> QR Vehicle Alert Protected
                    </div>
                    <p className="mt-1 text-xs text-[#F4EFEA]">
                      Full digital proxy shield. 100% anonymous two-way incident resolution without sharing contact data.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="rounded-xl border border-[#3A2316]/50 bg-[#A68C7B] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#F4EFEA]">
                      <CheckCircle2 size={15} /> Instant Emergency SOS Escalation
                    </div>
                    <p className="mt-1 text-xs text-[#F4EFEA]">
                      Immediate audible alert dispatch that cuts through silent modes for critical vehicular hazards.
                    </p>
                  </div>

                </div>

                {/* Bottom Card Action */}
                <div className="mt-4 pt-3 border-t border-[#3A2316]/30 flex items-center justify-between">
                  <span className="text-xs text-[#F4EFEA]">Ready to secure your vehicle?</span>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="btn-primary !h-9 !px-4 !text-xs !rounded-xl"
                  >
                    <span>Get Your QR</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CALL TO ACTION (CTA) BANNER                                  */}
        {/* ============================================================ */}
        <section
          className="relative bg-[#5B3B2A]"
          style={{ paddingTop: 'clamp(2rem, 4vw, 4rem)', paddingBottom: 'clamp(2rem, 4vw, 4rem)', paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)' }}
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(1536px, 100%)' }}
          >
            <div className="observe-fade relative overflow-hidden rounded-3xl border border-[#3A2316]/40 bg-[#1A0F0A] shadow-[0_20px_50px_rgba(26, 15, 10,0.35),0_0_30px_rgba(58, 35, 22,0.2)] glass-card-interactive"
              style={{ padding: 'clamp(1.5rem, 4vw, 3.5rem)' }}
            >

              {/* Blue Eclipse ambient glow circle inside CTA */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#3A2316]/20 blur-3xl" />

              <div className="relative z-10 mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3A2316]/40 bg-[#A68C7B] px-4 py-1 text-xs font-semibold text-[#F4EFEA]">
                  <ShieldAlert size={14} className="text-[#F4EFEA]" />
                  <span>PROTECT YOUR CAR TODAY</span>
                </div>

                <h2
                  className="mt-4 font-extrabold tracking-tight text-white"
                  style={{ fontSize: 'var(--text-h2)' }}
                >
                  Never Worry About Parking Incidents Again
                </h2>

                <p
                  className="mt-3 text-[#F4EFEA]"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  Register your vehicle in under 60 seconds. Generate your unique privacy QR code and place it on your windshield for peace of mind.
                </p>

                {/* Standardized Primary & Secondary CTA Buttons */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="btn-primary"
                  >
                    <span>Open Owner Portal</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('scanner-section')}
                    className="btn-secondary"
                  >
                    <ScanLine size={16} />
                    <span>Try Scanner Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* FOOTER                                                       */}
        {/* ============================================================ */}
        <footer
          className="relative border-t border-[#3A2316]/30 bg-[#1A0F0A] text-[#F4EFEA]"
          style={{ paddingTop: 'clamp(2.5rem, 5vw, 4rem)', paddingBottom: 'clamp(1.5rem, 3vw, 3rem)' }}
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(1536px, 100%)', paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)' }}
          >
            <div
              className="grid"
              style={{
                gap: 'clamp(1.5rem, 3vw, 2.5rem)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(180px, 18vw, 260px), 1fr))',
              }}
            >

              {/* Col 1: Brand Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A68C7B] border border-[#3A2316] text-white shadow-[0_0_12px_rgba(58, 35, 22,0.4)]">
                    <QrCode size={18} />
                  </div>
                  <span className="text-lg font-extrabold tracking-tight text-white">
                    QR Vehicle <span className="text-[#F4EFEA]">Alert</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#F4EFEA]/70">
                  The privacy-preserving vehicular contact standard. Reach any vehicle owner instantly without sharing personal phone numbers or installing mobile apps.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3A2316]/30 bg-[#A68C7B] px-3 py-1 text-[11px] text-[#F4EFEA]">
                  <span className="h-2 w-2 rounded-full bg-[#F4EFEA] animate-pulse" />
                  All Alert Gateways Operational
                </div>
              </div>

              {/* Col 2: Navigation Links */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#F4EFEA]">
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('hero')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('scanner-section')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Live QR Scanner
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('features')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Features & Highlights
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('about')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      How It Works
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 3: Owner Access */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Vehicle Owners</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#F4EFEA]">
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Owner Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Manage Vehicles
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="transition hover:text-white cursor-pointer"
                    >
                      Print Decal Stickers
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 4: Trust & Security */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Trust & Privacy</h4>
                <p className="mt-3 text-xs leading-relaxed text-[#F4EFEA]/70">
                  End-to-End Anonymity Guaranteed. No data brokering, no public directories, and zero spam call vulnerability.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#F4EFEA]">
                  <ShieldCheck size={15} /> 256-Bit SSL Encrypted Alerts
                </div>
              </div>

            </div>

            {/* Bottom Bar */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#3A2316]/30 pt-6 sm:flex-row text-xs text-[#F4EFEA]/50">
              <p>© {new Date().getFullYear()} QR Vehicle Alert.</p>
            </div>
          </div>
        </footer>

      </main>
    </div>
  )
}

export default Home
