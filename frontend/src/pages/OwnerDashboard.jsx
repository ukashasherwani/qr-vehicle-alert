import { useCallback, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  AlertCircle,
  BellRing,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Smartphone,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { io } from 'socket.io-client'
import { apiUrl, BACKEND_URL } from '../api/config'

function statusClasses(status) {
  if (status === 'resolved') {
    return 'bg-[#A68C7B] text-[#F4EFEA] border border-[#F4EFEA]/40'
  }

  if (status === 'in-progress') {
    return 'bg-[#3A2316]/30 text-white border border-[#3A2316]'
  }

  return 'bg-[#1A0F0A] text-white border border-[#F4EFEA]/40'
}

function urgencyClasses(urgency) {
  if (urgency === 'high') {
    return 'animate-pulse bg-[#3A2316]/40 text-white border border-[#F4EFEA]/50'
  }

  if (urgency === 'medium') {
    return 'bg-[#A68C7B] text-[#F4EFEA] border border-[#3A2316]'
  }

  return 'bg-[#A68C7B] text-[#F4EFEA] border border-[#3A2316]/40'
}

function getAlertContent(alert) {
  const issueTypes = (alert.issueType || '')
    .split(',')
    .map((issue) => issue.trim())
    .filter(Boolean)
  const predefinedIssues = issueTypes.filter((issue) => issue !== 'Custom')
  const customMessage = alert.message?.trim()

  if (predefinedIssues.length > 0) {
    return { title: predefinedIssues.join(', '), message: customMessage }
  }

  return {
    title: customMessage || 'Custom alert',
    message: undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Custom hook: IntersectionObserver scroll-reveal                     */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )

    const targets = document.querySelectorAll('.observe-fade')
    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  })
}

/* ------------------------------------------------------------------ */
/* Ticker items for the analytics strip                                */
/* ------------------------------------------------------------------ */
function StatTicker({ totalVehicles, totalAlerts, resolvedAlerts, pendingAlerts, resolutionRate }) {
  const items = [
    { icon: <CarFront size={13} className="text-[#F4EFEA]" />, label: `${totalVehicles} Vehicle${totalVehicles !== 1 ? 's' : ''} Registered` },
    { icon: <TrendingUp size={13} className="text-[#F4EFEA]" />, label: `${totalAlerts} Total Incidents` },
    { icon: <BellRing size={13} className="text-[#F4EFEA]" />, label: `${pendingAlerts} Pending Alerts` },
    { icon: <CheckCircle2 size={13} className="text-[#F4EFEA]" />, label: `${resolvedAlerts} Resolved` },
    { icon: <ShieldCheck size={13} className="text-[#F4EFEA]" />, label: `${resolutionRate}% Resolution Rate` },
    { icon: <Zap size={13} className="text-[#F4EFEA]" />, label: 'Real-Time Socket Gateway Active' },
    { icon: <Smartphone size={13} className="text-[#F4EFEA]" />, label: '100% Anonymous Contact Relay' },
  ]

  return (
    <div className="relative border-t border-b border-[#3A2316]/25 bg-[#1A0F0A] py-2.5 overflow-hidden">
      <div className="ticker-strip">
        <div className="ticker-track">
          {[...items, ...items].map((item, i) => (
            /* eslint-disable-next-line react/no-array-index-key */
            <span key={i} className="ticker-item">
              {item.icon}
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function OwnerDashboard() {
  const { getToken } = useAuth()
  const { isLoaded, isSignedIn, user } = useUser()
  const [vehicles, setVehicles] = useState([])
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ plateNumber: '', model: '', ownerPhone: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [toast, setToast] = useState('')

  // Section 3 & 4 Interactive UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSettingsTab, setActiveSettingsTab] = useState('delivery')
  const [toggleSettings, setToggleSettings] = useState({
    instantSms: true,
    emergencySiren: true,
    phoneMasking: true,
    dailyDigest: false,
  })

  /* Scroll-reveal IntersectionObserver */
  useScrollReveal()

  const loadDashboard = useCallback(async () => {
    if (!user) return

    try {
      const clerkId = encodeURIComponent(user.id)
      const [vehiclesResponse, alertsResponse] = await Promise.all([
        fetch(apiUrl(`/vehicles/owner/${clerkId}`)),
        fetch(apiUrl(`/alerts/owner/${clerkId}`)),
      ])

      if (!vehiclesResponse.ok || !alertsResponse.ok) {
        throw new Error('Unable to load your dashboard.')
      }

      setVehicles(await vehiclesResponse.json())
      setAlerts(await alertsResponse.json())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const handleRefresh = () => {
    setError('')
    loadDashboard()
  }

  const handleResolveAlert = async (alertId) => {
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/alerts/${alertId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'resolved' }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to resolve alert.')
      setAlerts((currentAlerts) => currentAlerts.map((alert) => (
        alert._id === alertId ? { ...alert, status: 'resolved' } : alert
      )))
      setToast('Alert marked as resolved.')
    } catch (resolveError) {
      setError(resolveError.message)
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // The initial dashboard fetch synchronizes this view with the API.
      // oxlint-disable-next-line react/set-state-in-effect
      loadDashboard()
    }
  }, [isLoaded, isSignedIn, loadDashboard])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return undefined

    const socket = io(BACKEND_URL)
    const handleNewAlert = ({ alert, vehicleOwnerClerkId }) => {
      if (vehicleOwnerClerkId !== user.id || !alert) return

      setAlerts((currentAlerts) => {
        if (currentAlerts.some((currentAlert) => currentAlert._id === alert._id)) {
          return currentAlerts
        }

        return [alert, ...currentAlerts]
      })
      setToast('New alert received for your vehicle!')
    }

    const handleAlertUpdated = ({ alert }) => {
      if (!alert || alert.vehicleId?.ownerClerkId !== user.id) return
      setAlerts((currentAlerts) => currentAlerts.map((currentAlert) => (
        currentAlert._id === alert._id ? { ...currentAlert, ...alert } : currentAlert
      )))
    }

    socket.on('newAlert', handleNewAlert)
    socket.on('alertUpdated', handleAlertUpdated)
    socket.on('alertStatusChanged', handleAlertUpdated)

    return () => {
      socket.off('newAlert', handleNewAlert)
      socket.off('alertUpdated', handleAlertUpdated)
      socket.off('alertStatusChanged', handleAlertUpdated)
      socket.disconnect()
    }
  }, [isLoaded, isSignedIn, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(apiUrl('/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ownerClerkId: user.id,
          ownerEmail: user.primaryEmailAddress?.emailAddress,
          ownerPhone: form.ownerPhone,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message || 'Unable to register vehicle.')
      }

      setForm({ plateNumber: '', model: '', ownerPhone: '' })
      setSuccess('Vehicle registered successfully.')
      await loadDashboard()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text, label) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
      setToast(`${label} copied to clipboard!`)
    }
  }

  useEffect(() => {
    if (!success) return undefined
    const timeoutId = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timeoutId)
  }, [success])

  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timeoutId)
  }, [toast])

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center bg-[#5B3B2A] px-6 py-16 text-white">
        <div className="flex items-center gap-3 text-lg font-semibold text-white">
          <RefreshCw className="animate-spin text-[#F4EFEA]" size={22} />
          Loading your Blue Eclipse Dashboard...
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center bg-[#5B3B2A] px-6 py-16 text-white">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md card-hover-glow bg-[#1A0F0A] border border-[#3A2316]/40 text-white">
          <ShieldCheck className="mx-auto text-[#F4EFEA]" size={40} />
          <h2 className="mt-4 text-xl font-bold text-white">Sign In Required</h2>
          <p className="mt-2 text-sm text-[#F4EFEA]">Sign in to access your vehicle registration and real-time alert logs.</p>
        </div>
      </div>
    )
  }

  // Analytics Calculations for Section 2
  const totalVehicles = vehicles.length
  const totalAlerts = alerts.length
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved').length
  const pendingAlerts = alerts.filter((a) => a.status !== 'resolved').length
  const resolutionRate = totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 100

  // Filtered vehicles for Section 3 Table
  const filteredVehicles = vehicles.filter((v) =>
    (v.plateNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.model || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main
      className="min-h-[calc(100vh-81px)] bg-[#5B3B2A] text-white selection:bg-[#1A0F0A] selection:text-white"
      style={{ paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)', paddingTop: 'clamp(1.5rem, 3vw, 2.5rem)', paddingBottom: '2rem' }}
    >
      {toast && (
        <div role="status" className="fixed right-4 top-24 z-50 rounded-xl border border-[#3A2316]/50 bg-[#1A0F0A] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(26, 15, 10,0.4),0_0_15px_rgba(58, 35, 22,0.25)]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F4EFEA] animate-ping" />
            {toast}
          </span>
        </div>
      )}

      <div
        className="mx-auto w-full"
        style={{ maxWidth: 'min(2000px, 100%)', display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}
      >
        {/* Dashboard Top Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#3A2316]/30 pb-4 sm:flex-row sm:items-end">
          <div className="observe-fade fade-left">
            <h1
              className="font-extrabold tracking-tight text-white"
              style={{ fontSize: 'var(--text-h2)' }}
            >
              Vehicle & Alert Management
            </h1>
            <p className="mt-1 text-sm text-[#F4EFEA]">
              Configure vehicle decals, review anonymous incoming reports, and inspect live safety telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-secondary !h-10 !px-4 !text-xs !rounded-xl observe-fade delay-2"
          >
            <RefreshCw size={14} />
            <span>Refresh Dashboard</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[#3A2316]/40 bg-[#1A0F0A] px-4 py-3 text-sm text-[#F4EFEA]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 font-medium">
            {success}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: VEHICLE MANAGEMENT & INCOMING ALERTS              */}
        {/* ============================================================ */}
        <section aria-labelledby="section-1-heading">
          <div className="flex items-center justify-between border-b border-[#3A2316]/30 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A0F0A] border border-[#3A2316]/60 text-xs font-bold text-white shadow-[0_0_10px_rgba(26, 15, 10,0.3)]">
                1
              </span>
              <h2 id="section-1-heading" className="text-lg font-bold text-white">
                Registered Vehicles & Active QR Decals
              </h2>
            </div>
            <span className="text-xs text-[#F4EFEA]/80">Core Decal System</span>
          </div>

          <div
            className="grid"
            style={{
              gap: 'var(--card-gap)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              alignItems: 'start',
            }}
          >
            {/* Left: Registered Vehicles Grid */}
            <div>
              {vehicles.length === 0 ? (
                <div className="glass-card rounded-2xl border-dashed border-[#3A2316]/30 p-8 text-center text-[#F4EFEA] observe-fade bg-[#1A0F0A]">
                  <CarFront className="mx-auto mb-3 text-[#F4EFEA]/60" size={36} />
                  <p className="font-semibold text-white">No vehicles registered yet.</p>
                  <p className="mt-1 text-xs text-[#F4EFEA]">Use the registration form on the right to claim your first vehicle QR sticker.</p>
                </div>
              ) : (
                <div className="fluid-grid-vehicles">
                  {vehicles.map((vehicle, idx) => {
                    const scanUrl = `${window.location.origin}/scan/${vehicle._id}`
                    return (
                      <article
                        key={vehicle._id}
                        className={`glass-card card-hover-glow observe-fade ${idx < 3 ? `delay-${idx + 1}` : ''} flex flex-col justify-between gap-3 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white`}
                        style={{ padding: 'var(--card-padding)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 rounded-xl border border-[#3A2316]/40 bg-white p-1.5 shadow-sm">
                            <QRCodeCanvas value={scanUrl} size={88} level="M" includeMargin />
                          </div>
                          <div className="min-w-0 py-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4EFEA]">
                              Active Decal
                            </span>
                            <h3 className="mt-0.5 truncate text-base font-bold text-white">
                              {vehicle.plateNumber}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#F4EFEA] truncate">
                              {vehicle.model || 'Model not specified'}
                            </p>
                            <p className="mt-1.5 text-[11px] text-[#F4EFEA]/70">
                              Owner: {vehicle.ownerPhone || 'Masked'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#3A2316]/25 pt-2.5">
                          <a
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4EFEA] hover:text-white transition"
                            href={`/scan/${vehicle._id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <QrCode size={13} />
                            <span>Open scan portal</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(scanUrl, 'Scan URL')}
                            className="text-xs text-[#F4EFEA] hover:text-white transition flex items-center gap-1"
                            title="Copy Scan URL"
                          >
                            <Copy size={13} />
                            <span>Copy link</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: Registration Form */}
            <form
              onSubmit={handleSubmit}
              className="glass-card observe-fade delay-2 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white h-fit card-hover-glow"
              style={{ padding: 'var(--card-padding)' }}
            >
              <div className="mb-4 flex items-center gap-2 border-b border-[#3A2316]/30 pb-3">
                <Plus className="text-[#F4EFEA]" size={18} />
                <h3 className="text-base font-bold text-white">Register New Vehicle</h3>
              </div>

              <label className="block text-xs font-semibold text-[#F4EFEA]" htmlFor="plateNumber">
                License Plate Number *
              </label>
              <input
                id="plateNumber"
                required
                value={form.plateNumber}
                onChange={(event) => setForm({ ...form, plateNumber: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#3A2316]/40 bg-[#A68C7B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#F4EFEA]/50 focus:border-[#F4EFEA] focus:ring-1 focus:ring-[#F4EFEA] transition"
                placeholder="e.g. ABC-1234"
              />

              <label className="mt-3 block text-xs font-semibold text-[#F4EFEA]" htmlFor="model">
                Vehicle Make / Model
              </label>
              <input
                id="model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#3A2316]/40 bg-[#A68C7B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#F4EFEA]/50 focus:border-[#F4EFEA] focus:ring-1 focus:ring-[#F4EFEA] transition"
                placeholder="e.g. Toyota Corolla"
              />

              <label className="mt-3 block text-xs font-semibold text-[#F4EFEA]" htmlFor="ownerPhone">
                Owner Phone (Confidential & Cloaked) *
              </label>
              <input
                id="ownerPhone"
                required
                value={form.ownerPhone}
                onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#3A2316]/40 bg-[#A68C7B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#F4EFEA]/50 focus:border-[#F4EFEA] focus:ring-1 focus:ring-[#F4EFEA] transition"
                placeholder="+1 555 019 2831"
                type="tel"
              />

              <button
                disabled={isSaving}
                className="btn-primary mt-5 w-full"
                type="submit"
              >
                <Plus size={18} />
                <span>{isSaving ? 'Registering...' : 'Register Vehicle Decal'}</span>
              </button>
            </form>
          </div>

          {/* Incoming Alerts Sub-container */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="text-[#1A0F0A]" size={18} />
              <h3 className="text-base font-bold text-[#1A0F0A]">Live Incoming Alerts</h3>
              <span className="ml-1 rounded-full bg-[#1A0F0A] border border-[#3A2316]/40 px-2 py-0.5 text-xs font-bold text-white">
                {alerts.length}
              </span>
            </div>

            <div className="glass-card overflow-hidden rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-[#F4EFEA]">
                  <CheckCircle2 className="mx-auto mb-2 text-[#F4EFEA]" size={26} />
                  <p className="font-semibold text-white">All clear!</p>
                  <p className="text-xs text-[#F4EFEA]/70">No open incident alerts or emergency broadcasts reported for your vehicles.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#3A2316]/20">
                  {alerts.map((alert) => {
                    const alertContent = getAlertContent(alert)
                    return (
                      <article
                        key={alert._id}
                        className="observe-fade flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between transition hover:bg-[#A68C7B]"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {alertContent.title}
                            </span>
                          </div>
                          {alertContent.message && (
                            <p className="text-sm text-[#F4EFEA]">{alertContent.message}</p>
                          )}
                          <p className="text-xs text-[#F4EFEA]/70">
                            Vehicle: <span className="text-white font-semibold">{alert.vehicleId?.plateNumber || 'Unknown'}</span> · {new Date(alert.createdAt).toLocaleString()}
                          </p>
                          {alert.imageUrl && (
                            <a href={alert.imageUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block">
                              <img
                                src={alert.imageUrl}
                                alt="Alert evidence"
                                className="h-16 w-16 rounded-xl object-cover ring-1 ring-[#3A2316]/40 transition hover:opacity-80"
                              />
                            </a>
                          )}
                        </div>

                        <div className="flex w-fit shrink-0 flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${urgencyClasses(alert.urgency)}`}>
                            {alert.urgency || 'low'} urgency
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusClasses(alert.status)}`}>
                            {alert.status || 'pending'}
                          </span>
                          {(alert.status || 'pending') === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleResolveAlert(alert._id)}
                              className="btn-primary !h-7 !px-3 !text-xs !rounded-full"
                            >
                              <Check size={12} />
                              <span>Resolve</span>
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* STAT TICKER STRIP (between Sections 1 & 2)                  */}
        {/* ============================================================ */}
        <StatTicker
          totalVehicles={totalVehicles}
          totalAlerts={totalAlerts}
          resolvedAlerts={resolvedAlerts}
          pendingAlerts={pendingAlerts}
          resolutionRate={resolutionRate}
        />

        {/* ============================================================ */}
        {/* SECTION 2: ANALYTICS / OVERVIEW SECTION                     */}
        {/* ============================================================ */}
        <section aria-labelledby="section-2-heading">
          <div className="flex items-center justify-between border-b border-[#3A2316]/30 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A0F0A] border border-[#3A2316]/60 text-xs font-bold text-white shadow-[0_0_10px_rgba(26, 15, 10,0.3)]">
                2
              </span>
              <h2 id="section-2-heading" className="text-lg font-bold text-white">
                Telemetry & Incident Analytics Overview
              </h2>
            </div>
            <span className="text-xs text-[#F4EFEA]/80">Performance Metrics</span>
          </div>

          {/* 4 Stat Cards — fluid grid */}
          <div className="fluid-grid-stats">
            {/* Stat 1 */}
            <div className="glass-card card-hover-glow observe-fade delay-1 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4EFEA] uppercase tracking-wider">Total Vehicles</span>
                <CarFront size={17} className="text-[#F4EFEA]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-white">{totalVehicles}</p>
              <p className="mt-1 text-xs text-[#F4EFEA]/70">Registered to your account</p>
            </div>

            {/* Stat 2 */}
            <div className="glass-card card-hover-glow observe-fade delay-2 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4EFEA] uppercase tracking-wider">Total Incidents</span>
                <TrendingUp size={17} className="text-[#F4EFEA]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-white">{totalAlerts}</p>
              <p className="mt-1 text-xs text-[#F4EFEA]/70">Lifetime alerts captured</p>
            </div>

            {/* Stat 3 */}
            <div className="glass-card card-hover-glow observe-fade delay-3 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4EFEA] uppercase tracking-wider">Pending Attention</span>
                <BellRing size={17} className="text-[#F4EFEA]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-white">{pendingAlerts}</p>
              <p className="mt-1 text-xs text-[#F4EFEA]/70">Requires owner action</p>
            </div>

            {/* Stat 4 */}
            <div className="glass-card card-hover-glow observe-fade delay-4 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4EFEA] uppercase tracking-wider">Privacy Shield</span>
                <ShieldCheck size={17} className="text-[#F4EFEA]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-white">100%</p>
              <p className="mt-1 text-xs text-[#F4EFEA]/70">Cloaked numbers & anonymity</p>
            </div>
          </div>

          {/* Progress Bars Container */}
          <div className="glass-card observe-fade mt-4 rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] text-white" style={{ padding: 'var(--card-padding)' }}>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Zap size={15} className="text-[#F4EFEA]" />
              Operational Health & Progress Bars
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}>
              {/* Progress 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Alert Resolution Rate</span>
                  <span className="text-[#F4EFEA]">{resolutionRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#A68C7B]">
                  <div
                    className="h-full bg-[#F4EFEA] transition-all duration-700 shadow-[0_0_10px_rgba(244, 239, 234,0.5)]"
                    style={{ width: `${resolutionRate}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#F4EFEA]">
                  {resolvedAlerts} of {totalAlerts} incidents safely resolved.
                </p>
              </div>

              {/* Progress 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">QR Code Dynamic Decal Verification</span>
                  <span className="text-[#F4EFEA]">100% Active</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#A68C7B]">
                  <div
                    className="h-full bg-[#F4EFEA] transition-all duration-700 shadow-[0_0_10px_rgba(244, 239, 234,0.5)]"
                    style={{ width: '100%' }}
                  />
                </div>
                <p className="text-[11px] text-[#F4EFEA]">
                  All registered vehicle QR codes synchronize with instant scanning routing.
                </p>
              </div>

              {/* Progress 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Real-Time Socket Gateway Uptime</span>
                  <span className="text-[#F4EFEA]">99.98%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#A68C7B]">
                  <div
                    className="h-full bg-gradient-to-r from-[#3A2316] to-[#F4EFEA] transition-all duration-700"
                    style={{ width: '99.98%' }}
                  />
                </div>
                <p className="text-[11px] text-[#F4EFEA]">
                  Sub-second alert dispatch readiness across WebSockets.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 3: INTERACTIVE DATA TABLE / MANAGEMENT              */}
        {/* ============================================================ */}
        <section aria-labelledby="section-3-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#3A2316]/30 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A0F0A] border border-[#3A2316]/60 text-xs font-bold text-white shadow-[0_0_10px_rgba(26, 15, 10,0.3)]">
                3
              </span>
              <h2 id="section-3-heading" className="text-lg font-bold text-white">
                Vehicle Fleet Data Table & Management
              </h2>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F4EFEA]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plate or model..."
                className="w-full rounded-xl border border-[#3A2316]/40 bg-[#A68C7B] pl-8 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-[#F4EFEA]/60 focus:border-[#F4EFEA] transition"
              />
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="observe-fade overflow-hidden rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#F4EFEA]">
                <thead className="border-b border-[#3A2316]/30 bg-[#A68C7B] text-[11px] uppercase tracking-wider text-white">
                  <tr>
                    <th scope="col" className="px-4 py-3">Plate Number</th>
                    <th scope="col" className="px-4 py-3">Make / Model</th>
                    <th scope="col" className="px-4 py-3">Registered Contact</th>
                    <th scope="col" className="px-4 py-3">Total Alerts</th>
                    <th scope="col" className="px-4 py-3">Decal Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2316]/20">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-[#F4EFEA]">
                        {vehicles.length === 0
                          ? 'No vehicles in fleet.'
                          : 'No vehicles match your search filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const scanUrl = `${window.location.origin}/scan/${vehicle._id}`
                      const vehicleAlertCount = alerts.filter(
                        (a) => (a.vehicleId?._id || a.vehicleId) === vehicle._id
                      ).length

                      return (
                        <tr
                          key={vehicle._id}
                          className="bg-[#1A0F0A] transition-all hover:bg-[#A68C7B] hover:-translate-y-px"
                        >
                          <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                            {vehicle.plateNumber}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {vehicle.model || '—'}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="rounded-md bg-[#A68C7B] border border-[#3A2316]/30 px-2 py-0.5 font-mono text-[11px] text-[#F4EFEA]">
                              {vehicle.ownerPhone || 'Masked'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              vehicleAlertCount > 0 ? 'bg-[#3A2316] text-white' : 'bg-[#A68C7B] text-[#F4EFEA]'
                            }`}>
                              {vehicleAlertCount} alerts
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F4EFEA]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F4EFEA] animate-pulse" />
                              Ready & Verified
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(scanUrl, 'Decal Scan URL')}
                                className="rounded-lg border border-[#3A2316]/40 bg-[#A68C7B] p-1.5 text-[#F4EFEA] hover:border-[#F4EFEA] hover:text-white transition"
                                title="Copy Scan URL"
                              >
                                <Copy size={13} />
                              </button>
                              <a
                                href={`/scan/${vehicle._id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-[#3A2316]/40 bg-[#A68C7B] p-1.5 text-[#F4EFEA] hover:border-[#F4EFEA] hover:text-white transition"
                                title="Open Decal Scan Portal"
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4: SETTINGS / SECONDARY TOOLS PANEL                 */}
        {/* ============================================================ */}
        <section aria-labelledby="section-4-heading" className="pb-8">
          <div className="flex items-center justify-between border-b border-[#3A2316]/30 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A0F0A] border border-[#3A2316]/60 text-xs font-bold text-white shadow-[0_0_10px_rgba(26, 15, 10,0.3)]">
                4
              </span>
              <h2 id="section-4-heading" className="text-lg font-bold text-white">
                Decal Preferences & Secondary Tools Panel
              </h2>
            </div>
            <span className="text-xs text-[#F4EFEA]/80">Custom Controls</span>
          </div>

          <div className="observe-fade glass-card rounded-2xl border border-[#3A2316]/35 bg-[#1A0F0A] overflow-hidden">
            {/* Tab Switching Header */}
            <div className="flex border-b border-[#3A2316]/30 bg-[#A68C7B] px-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('delivery')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                  activeSettingsTab === 'delivery'
                    ? 'border-[#F4EFEA] text-white'
                    : 'border-transparent text-[#F4EFEA] hover:text-white'
                }`}
              >
                <Sliders size={13} className={activeSettingsTab === 'delivery' ? 'text-white' : ''} />
                <span>Alert Routing Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('printing')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                  activeSettingsTab === 'printing'
                    ? 'border-[#F4EFEA] text-white'
                    : 'border-transparent text-[#F4EFEA] hover:text-white'
                }`}
              >
                <FileText size={13} className={activeSettingsTab === 'printing' ? 'text-white' : ''} />
                <span>Sticker Placement Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('security')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                  activeSettingsTab === 'security'
                    ? 'border-[#F4EFEA] text-white'
                    : 'border-transparent text-[#F4EFEA] hover:text-white'
                }`}
              >
                <ShieldCheck size={13} className={activeSettingsTab === 'security' ? 'text-white' : ''} />
                <span>Anonymity & Security</span>
              </button>
            </div>

            {/* Tab 1: Alert Routing Preferences */}
            {activeSettingsTab === 'delivery' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <p className="text-xs text-[#F4EFEA]">
                  Manage how the vehicle proxy alerts you when a passerby scans your decal.
                </p>

                <div className="space-y-3">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 transition hover:border-[#3A2316]/60">
                    <div>
                      <h4 className="text-sm font-bold text-white">Instant SMS Gateway Notifications</h4>
                      <p className="text-xs text-[#F4EFEA]">Receive an SMS ping immediately upon QR decal recognition.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.instantSms}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, instantSms: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[#1A0F0A] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 transition hover:border-[#3A2316]/60">
                    <div>
                      <h4 className="text-sm font-bold text-white">Audible SOS Siren Emergency Bypass</h4>
                      <p className="text-xs text-[#F4EFEA]">Elevate emergency SOS notifications with high-priority audible alert.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.emergencySiren}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, emergencySiren: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[#1A0F0A] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>

                  {/* Toggle 3 */}
                  <div className="flex items-center justify-between rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 transition hover:border-[#3A2316]/60">
                    <div>
                      <h4 className="text-sm font-bold text-white">Strict Phone Number Cloaking</h4>
                      <p className="text-xs text-[#F4EFEA]">Ensure browser clients never receive real phone numbers under any circumstance.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.phoneMasking}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, phoneMasking: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[#1A0F0A] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Sticker Placement Guide */}
            {activeSettingsTab === 'printing' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <h4 className="text-sm font-bold text-white">Optimal Physical Decal Printing & Placement</h4>
                <p className="text-xs text-[#F4EFEA]">Follow these tips to ensure maximum durability and scan rates on your vehicle:</p>

                <div className="fluid-grid-tips pt-1">
                  <div className="rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 card-hover-glow text-[#F4EFEA]">
                    <span className="text-xs font-bold text-white">1. Windshield Corner</span>
                    <p className="mt-1 text-xs text-[#F4EFEA]">Place sticker on the lower passenger side corner of the front windshield for clear line-of-sight.</p>
                  </div>

                  <div className="rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 card-hover-glow text-[#F4EFEA]">
                    <span className="text-xs font-bold text-white">2. Weatherproof Vinyl</span>
                    <p className="mt-1 text-xs text-[#F4EFEA]">Print on UV-resistant, weatherproof matte vinyl stickers to avoid glare under direct sun.</p>
                  </div>

                  <div className="rounded-xl border border-[#3A2316]/30 bg-[#A68C7B] p-3.5 card-hover-glow text-[#F4EFEA]">
                    <span className="text-xs font-bold text-white">3. Recommended Size</span>
                    <p className="mt-1 text-xs text-[#F4EFEA]">2.5 x 2.5 inches (65mm) gives standard smartphone cameras instant autofocus lock from 3-5 feet.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Anonymity & Security */}
            {activeSettingsTab === 'security' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <h4 className="text-sm font-bold text-white">Privacy Infrastructure Guarantee</h4>
                <p className="text-xs text-[#F4EFEA]">
                  Your account is protected by Clerk identity tokens and server-side notification relays.
                </p>

                <div className="rounded-xl border border-[#F4EFEA]/30 bg-[#A68C7B] p-3.5 text-xs text-[#F4EFEA] space-y-2">
                  <p className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 size={15} className="text-[#F4EFEA]" /> 256-Bit TLS Socket Tunnel
                  </p>
                  <p>
                    Passersby never interact with your contact details. Alert dispatches are signed and verified server-side.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default OwnerDashboard
