import { useEffect, useRef, useState } from 'react'
import { Camera, CircleAlert, LoaderCircle, ScanLine } from 'lucide-react'
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

function Home() {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const hasScannedRef = useRef(false)
  const [scanError, setScanError] = useState('')
  const [hasScanned, setHasScanned] = useState(false)

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

  return (
    <main className="min-h-[calc(100vh-81px)] bg-[#0a0a0c] px-4 py-10 text-white sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section className="animate-rise-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white/80">
            <ScanLine size={16} />
            Quick vehicle contact
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">Scan a vehicle. Send the right alert.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">Use your camera to scan a vehicle QR code and privately notify its owner about an issue.</p>
        </section>

        <section className="glass-card animate-rise-in rounded-2xl p-4 text-white sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-white"><Camera size={20} /></div>
            <div>
              <h2 className="font-bold">Scan QR code</h2>
              <p className="text-sm text-white/50">Allow camera access to begin</p>
            </div>
          </div>
          <div id={SCANNER_ID} className="overflow-hidden rounded-xl" />
          {hasScanned && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/80"><LoaderCircle className="animate-spin" size={16} /> Opening vehicle page...</p>}
          {scanError && <p className="mt-4 flex items-start gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]"><CircleAlert className="mt-0.5 shrink-0" size={16} />{scanError}</p>}
        </section>
      </div>
    </main>
  )
}

export default Home
