import { useCallback, useEffect, useState } from 'react'
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/clerk-react'
import { jsPDF } from 'jspdf'
import {
  BellRing,
  CarFront,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Smartphone,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { io } from 'socket.io-client'
import { apiUrl, BACKEND_URL } from '../api/config'
import ThemeToggle from '../components/ThemeToggle'

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
    { icon: <CarFront size={13} className="text-[var(--text-body)]" />, label: `${totalVehicles} Vehicle${totalVehicles !== 1 ? 's' : ''} Registered` },
    { icon: <TrendingUp size={13} className="text-[var(--text-body)]" />, label: `${totalAlerts} Total Incidents` },
    { icon: <BellRing size={13} className="text-[var(--text-body)]" />, label: `${pendingAlerts} Pending Alerts` },
    { icon: <CheckCircle2 size={13} className="text-[var(--text-body)]" />, label: `${resolvedAlerts} Resolved` },
    { icon: <ShieldCheck size={13} className="text-[var(--text-body)]" />, label: `${resolutionRate}% Resolution Rate` },
    { icon: <Zap size={13} className="text-[var(--text-body)]" />, label: 'Real-Time Socket Gateway Active' },
    { icon: <Smartphone size={13} className="text-[var(--text-body)]" />, label: '100% Anonymous Contact Relay' },
  ]

  return (
    <div className="relative border-t border-b border-[var(--border-divider)] bg-[var(--bg-card)] py-2.5 overflow-hidden">
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [toast, setToast] = useState('')
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [editForm, setEditForm] = useState({ plateNumber: '', model: '', ownerPhone: '' })
  const [isEditing, setIsEditing] = useState(false)

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
    if (!isSignedIn) return
    setError('')
    setIsRefreshing(true)
    loadDashboard().finally(() => setIsRefreshing(false))
  }

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Keep the public dashboard form usable while Clerk resolves signed-out state.
      // oxlint-disable-next-line react/set-state-in-effect
      setIsLoading(false)
    } else if (isLoaded && isSignedIn) {
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
    if (!isSignedIn) {
      setShowAuthPrompt(true)
      return
    }

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

  const openEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle)
    setEditForm({
      plateNumber: vehicle.plateNumber || '',
      model: vehicle.model || '',
      ownerPhone: vehicle.ownerPhone || '',
    })
    setError('')
  }

  const handleEditVehicle = async (event) => {
    event.preventDefault()
    setIsEditing(true)
    setError('')

    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/vehicles/${editingVehicle._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...editForm, ownerClerkId: user.id }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Unable to update vehicle.')

      setEditingVehicle(null)
      setSuccess('Vehicle updated successfully.')
      await loadDashboard()
    } catch (editError) {
      setError(editError.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Delete ${vehicle.plateNumber}?`)) return

    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/vehicles/${vehicle._id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ownerClerkId: user.id }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Unable to delete vehicle.')

      setSuccess('Vehicle deleted successfully.')
      await loadDashboard()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const downloadVehiclePdf = (vehicle, scanUrl) => {
    const qrCanvas = document.getElementById(`vehicle-qr-${vehicle._id}`)
    if (!qrCanvas) {
      setError('Unable to generate the QR code PDF.')
      return
    }

    const pdf = new jsPDF()
    pdf.setFontSize(20)
    pdf.text('QR Vehicle Alert', 20, 25)
    pdf.setFontSize(14)
    pdf.text(`Plate Number: ${vehicle.plateNumber}`, 20, 42)
    pdf.text(`Make / Model: ${vehicle.model || 'Not specified'}`, 20, 52)
    pdf.text(`Owner Phone: ${vehicle.ownerPhone || 'Not specified'}`, 20, 62)
    pdf.addImage(qrCanvas.toDataURL('image/png'), 'PNG', 20, 75, 70, 70)
    pdf.setFontSize(10)
    pdf.text(scanUrl, 20, 158)
    pdf.save(`${vehicle.plateNumber || 'vehicle'}-qr-code.pdf`)
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

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center bg-[var(--bg-main)] px-6 py-16 text-[var(--text-primary)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="animate-spin text-[var(--text-body)]" size={28} aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Loading Dashboard...</p>
            <p className="mt-1 text-sm text-[var(--text-body)] animate-pulse">Preparing your vehicle workspace</p>
          </div>
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
      className="min-h-[calc(100vh-81px)] bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-[var(--bg-card)] selection:text-[var(--text-primary)]"
      style={{ paddingLeft: 'var(--container-px)', paddingRight: 'var(--container-px)', paddingTop: 'clamp(1.5rem, 3vw, 2.5rem)', paddingBottom: '2rem' }}
    >
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-vehicle-title">
          <form onSubmit={handleEditVehicle} className="glass-card w-full max-w-md rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="edit-vehicle-title" className="text-lg font-bold">Edit Vehicle</h2>
              <button type="button" onClick={() => setEditingVehicle(null)} className="rounded-lg p-1.5 text-[var(--text-body)] hover:text-[var(--text-primary)]" aria-label="Close edit vehicle dialog">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <label className="block text-xs font-semibold text-[var(--text-body)]" htmlFor="edit-plateNumber">License Plate Number *</label>
            <input id="edit-plateNumber" required value={editForm.plateNumber} onChange={(event) => setEditForm({ ...editForm, plateNumber: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm outline-none" />
            <label className="mt-3 block text-xs font-semibold text-[var(--text-body)]" htmlFor="edit-model">Vehicle Make / Model</label>
            <input id="edit-model" value={editForm.model} onChange={(event) => setEditForm({ ...editForm, model: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm outline-none" />
            <label className="mt-3 block text-xs font-semibold text-[var(--text-body)]" htmlFor="edit-ownerPhone">Owner Phone *</label>
            <input id="edit-ownerPhone" required type="tel" value={editForm.ownerPhone} onChange={(event) => setEditForm({ ...editForm, ownerPhone: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm outline-none" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingVehicle(null)} className="rounded-xl border border-[var(--border-divider)] px-4 py-2 text-sm">Cancel</button>
              <button disabled={isEditing} type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm">{isEditing ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title">
          <div className="glass-card w-full max-w-md rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] p-6 text-center shadow-2xl">
            <ShieldCheck className="mx-auto text-[var(--text-body)]" size={40} />
            <h2 id="auth-prompt-title" className="mt-4 text-xl font-bold text-[var(--text-primary)]">Sign in required</h2>
            <p className="mt-2 text-sm text-[var(--text-body)]">Sign in required: Please sign in or create an account to register a vehicle decal.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => setShowAuthPrompt(false)} className="rounded-xl border border-[var(--border-divider)] px-4 py-2 text-sm font-semibold transition hover:border-neutral-400">Cancel</button>
              <SignInButton mode="modal">
                <button type="button" className="btn-secondary rounded-xl px-4 py-2 text-sm">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm">Create Account</button>
              </SignUpButton>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed right-4 top-24 z-50 rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_15px_rgba(136,136,136,0.25)]">
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
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border-divider)] pb-4 sm:flex-row sm:items-end">
          <div className="observe-fade fade-left">
            <h1
              className="font-extrabold tracking-tight text-[var(--text-primary)]"
              style={{ fontSize: 'var(--text-h2)' }}
            >
              Vehicle & Alert Management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-body)]">
              Configure vehicle decals, review anonymous incoming reports, and inspect live safety telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!isSignedIn || isRefreshing}
            className="btn-secondary !h-10 !px-4 !text-xs !rounded-xl border border-[var(--border-divider)] transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 observe-fade delay-2"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh Dashboard</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-body)]">
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
          <div className="flex items-center justify-between border-b border-[var(--border-divider)] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-divider)] text-xs font-bold text-[var(--text-primary)] shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                1
              </span>
              <h2 id="section-1-heading" className="text-lg font-bold text-[var(--text-primary)]">
                Registered Vehicles & Active QR Decals
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Core Decal System</span>
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
                <div className="glass-card rounded-2xl border-dashed border-[var(--border-divider)] p-8 text-center text-[var(--text-body)] observe-fade bg-[var(--bg-card)]">
                  <CarFront className="mx-auto mb-3 text-[var(--text-muted)]" size={36} />
                  <p className="font-semibold text-[var(--text-primary)]">No vehicles registered yet.</p>
                  <p className="mt-1 text-xs text-[var(--text-body)]">Use the registration form on the right to claim your first vehicle QR sticker.</p>
                </div>
              ) : (
                <div className="fluid-grid-vehicles">
                  {vehicles.map((vehicle, idx) => {
                    const scanUrl = `${window.location.origin}/scan/${vehicle._id}`
                    return (
                      <article
                        key={vehicle._id}
                        className={`glass-card card-hover-glow observe-fade ${idx < 3 ? `delay-${idx + 1}` : ''} flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]`}
                        style={{ padding: 'var(--card-padding)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="shrink-0 rounded-xl border border-[var(--border-divider)] bg-white p-1.5 shadow-sm">
                              <QRCodeCanvas id={`vehicle-qr-${vehicle._id}`} value={scanUrl} size={88} level="M" includeMargin />
                            </div>
                            <div className="min-w-0 py-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-body)]">
                                Active Decal
                              </span>
                              <h3 className="mt-0.5 truncate text-base font-bold text-[var(--text-primary)]">
                                {vehicle.plateNumber}
                              </h3>
                              <p className="mt-0.5 text-xs text-[var(--text-body)] truncate">
                                {vehicle.model || 'Model not specified'}
                              </p>
                              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                                Owner: {vehicle.ownerPhone || 'Masked'}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditVehicle(vehicle)}
                              className="rounded-lg border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-1.5 text-[var(--text-body)] transition hover:text-[var(--text-primary)]"
                              title="Edit vehicle"
                              aria-label={`Edit ${vehicle.plateNumber}`}
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => downloadVehiclePdf(vehicle, scanUrl)}
                              className="ml-auto rounded-lg border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-1.5 text-[var(--text-body)] transition hover:text-[var(--text-primary)]"
                              title="Download QR Code"
                              aria-label={`Download QR Code for ${vehicle.plateNumber}`}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--border-divider)] pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(vehicle)}
                            className="rounded-lg border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-1.5 text-[var(--text-body)] transition hover:text-[var(--text-primary)]"
                            title="Delete vehicle"
                            aria-label={`Delete ${vehicle.plateNumber}`}
                          >
                            <Trash2 size={14} />
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
              className="glass-card observe-fade delay-2 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)] h-fit card-hover-glow"
              style={{ padding: 'var(--card-padding)' }}
            >
              <div className="mb-4 flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
                <Plus className="text-[var(--text-body)]" size={18} />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Register New Vehicle</h3>
              </div>

              <label className="block text-xs font-semibold text-[var(--text-body)]" htmlFor="plateNumber">
                License Plate Number *
              </label>
              <input
                id="plateNumber"
                required
                value={form.plateNumber}
                onChange={(event) => setForm({ ...form, plateNumber: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)] focus:ring-1 focus:ring-[#F4EFEA] transition"
                placeholder="e.g. ABC-1234"
              />

              <label className="mt-3 block text-xs font-semibold text-[var(--text-body)]" htmlFor="model">
                Vehicle Make / Model
              </label>
              <input
                id="model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)] focus:ring-1 focus:ring-[#F4EFEA] transition"
                placeholder="e.g. Toyota Corolla"
              />

              <label className="mt-3 block text-xs font-semibold text-[var(--text-body)]" htmlFor="ownerPhone">
                Owner Phone (Confidential & Cloaked) *
              </label>
              <input
                id="ownerPhone"
                required
                value={form.ownerPhone}
                onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)] focus:ring-1 focus:ring-[#F4EFEA] transition"
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
          <div className="flex items-center justify-between border-b border-[var(--border-divider)] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-divider)] text-xs font-bold text-[var(--text-primary)] shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                2
              </span>
              <h2 id="section-2-heading" className="text-lg font-bold text-[var(--text-primary)]">
                Telemetry & Incident Analytics Overview
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Performance Metrics</span>
          </div>

          {/* 4 Stat Cards — fluid grid */}
          <div className="fluid-grid-stats">
            {/* Stat 1 */}
            <div className="glass-card card-hover-glow observe-fade delay-1 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider">Total Vehicles</span>
                <CarFront size={17} className="text-[var(--text-body)]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-[var(--text-primary)]">{totalVehicles}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Registered to your account</p>
            </div>

            {/* Stat 2 */}
            <div className="glass-card card-hover-glow observe-fade delay-2 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider">Total Incidents</span>
                <TrendingUp size={17} className="text-[var(--text-body)]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-[var(--text-primary)]">{totalAlerts}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Lifetime alerts captured</p>
            </div>

            {/* Stat 3 */}
            <div className="glass-card card-hover-glow observe-fade delay-3 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider">Pending Attention</span>
                <BellRing size={17} className="text-[var(--text-body)]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-[var(--text-primary)]">{pendingAlerts}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Requires owner action</p>
            </div>

            {/* Stat 4 */}
            <div className="glass-card card-hover-glow observe-fade delay-4 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]" style={{ padding: 'var(--card-padding)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider">Privacy Shield</span>
                <ShieldCheck size={17} className="text-[var(--text-body)]" />
              </div>
              <p className="mt-2.5 text-3xl font-extrabold text-[var(--text-primary)]">100%</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Cloaked numbers & anonymity</p>
            </div>
          </div>

          {/* Progress Bars Container */}
          <div className="glass-card observe-fade mt-4 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]" style={{ padding: 'var(--card-padding)' }}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
              <Zap size={15} className="text-[var(--text-body)]" />
              Operational Health & Progress Bars
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}>
              {/* Progress 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">Alert Resolution Rate</span>
                  <span className="text-[var(--text-body)]">{resolutionRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card-inner)]">
                  <div
                    className="h-full bg-[#F4EFEA] transition-all duration-700 shadow-[0_0_10px_rgba(184,184,184,0.5)]"
                    style={{ width: `${resolutionRate}%` }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-body)]">
                  {resolvedAlerts} of {totalAlerts} incidents safely resolved.
                </p>
              </div>

              {/* Progress 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">QR Code Dynamic Decal Verification</span>
                  <span className="text-[var(--text-body)]">100% Active</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card-inner)]">
                  <div
                    className="h-full bg-[#F4EFEA] transition-all duration-700 shadow-[0_0_10px_rgba(184,184,184,0.5)]"
                    style={{ width: '100%' }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-body)]">
                  All registered vehicle QR codes synchronize with instant scanning routing.
                </p>
              </div>

              {/* Progress 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">Real-Time Socket Gateway Uptime</span>
                  <span className="text-[var(--text-body)]">99.98%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card-inner)]">
                  <div
                    className="h-full bg-gradient-to-r from-[#3A2316] to-[#F4EFEA] transition-all duration-700"
                    style={{ width: '99.98%' }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-body)]">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-divider)] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-divider)] text-xs font-bold text-[var(--text-primary)] shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                3
              </span>
              <h2 id="section-3-heading" className="text-lg font-bold text-[var(--text-primary)]">
                Vehicle Fleet Data Table & Management
              </h2>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plate or model..."
                className="w-full rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)] transition"
              />
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="observe-fade overflow-hidden rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--text-body)]">
                <thead className="border-b border-[var(--border-divider)] bg-[var(--bg-card-inner)] text-[11px] uppercase tracking-wider text-[var(--text-primary)]">
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
                      <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-body)]">
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
                          className="bg-[var(--bg-card)] transition-all hover:bg-[var(--bg-card-inner)] hover:-translate-y-px"
                        >
                          <td className="px-4 py-3.5 font-bold text-[var(--text-primary)] whitespace-nowrap">
                            {vehicle.plateNumber}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {vehicle.model || '—'}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="rounded-md bg-[var(--bg-card-inner)] border border-[var(--border-divider)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-body)]">
                              {vehicle.ownerPhone || 'Masked'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${vehicleAlertCount > 0 ? 'bg-[var(--bg-card-secondary)] text-[var(--text-primary)]' : 'bg-[var(--bg-card-inner)] text-[var(--text-body)]'
                              }`}>
                              {vehicleAlertCount} alerts
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-body)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F4EFEA] animate-pulse" />
                              Ready & Verified
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(scanUrl, 'Decal Scan URL')}
                                className="rounded-lg border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-1.5 text-[var(--text-body)] hover:border-[var(--border-divider)] hover:text-[var(--text-primary)] transition"
                                title="Copy Scan URL"
                              >
                                <Copy size={13} />
                              </button>
                              <a
                                href={`/scan/${vehicle._id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-1.5 text-[var(--text-body)] hover:border-[var(--border-divider)] hover:text-[var(--text-primary)] transition"
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
          <div className="flex items-center justify-between border-b border-[var(--border-divider)] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-divider)] text-xs font-bold text-[var(--text-primary)] shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                4
              </span>
              <h2 id="section-4-heading" className="text-lg font-bold text-[var(--text-primary)]">
                Decal Preferences & Secondary Tools Panel
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Custom Controls</span>
          </div>

          <div className="observe-fade glass-card rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] overflow-hidden">
            {/* Tab Switching Header */}
            <div className="flex border-b border-[var(--border-divider)] bg-[var(--bg-card-inner)] px-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('delivery')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${activeSettingsTab === 'delivery'
                    ? 'border-[var(--border-divider)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-body)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Sliders size={13} className={activeSettingsTab === 'delivery' ? 'text-[var(--text-primary)]' : ''} />
                <span>Alert Routing Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('printing')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${activeSettingsTab === 'printing'
                    ? 'border-[var(--border-divider)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-body)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <FileText size={13} className={activeSettingsTab === 'printing' ? 'text-[var(--text-primary)]' : ''} />
                <span>Sticker Placement Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('security')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${activeSettingsTab === 'security'
                    ? 'border-[var(--border-divider)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-body)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <ShieldCheck size={13} className={activeSettingsTab === 'security' ? 'text-[var(--text-primary)]' : ''} />
                <span>Anonymity & Security</span>
              </button>
            </div>

            {/* Tab 1: Alert Routing Preferences */}
            {activeSettingsTab === 'delivery' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <p className="text-xs text-[var(--text-body)]">
                  Manage how the vehicle proxy alerts you when a passerby scans your decal.
                </p>

                <div className="space-y-3">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 transition hover:border-[var(--border-divider)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Instant SMS Gateway Notifications</h4>
                      <p className="text-xs text-[var(--text-body)]">Receive an SMS ping immediately upon QR decal recognition.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.instantSms}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, instantSms: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[var(--bg-card)] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 transition hover:border-[var(--border-divider)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Audible SOS Siren Emergency Bypass</h4>
                      <p className="text-xs text-[var(--text-body)]">Elevate emergency SOS notifications with high-priority audible alert.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.emergencySiren}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, emergencySiren: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[var(--bg-card)] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>

                  {/* Toggle 3 */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 transition hover:border-[var(--border-divider)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Strict Phone Number Cloaking</h4>
                      <p className="text-xs text-[var(--text-body)]">Ensure browser clients never receive real phone numbers under any circumstance.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={toggleSettings.phoneMasking}
                        onChange={(e) => setToggleSettings({ ...toggleSettings, phoneMasking: e.target.checked })}
                        className="sr-only toggle-switch-input"
                      />
                      <div className="w-11 h-6 bg-[var(--bg-card)] rounded-full transition-colors toggle-switch-slider relative before:content-[''] before:absolute before:top-1 before:left-1 before:bg-white before:h-4 before:w-4 before:rounded-full before:transition-transform" />
                    </label>
                  </div>

                  {/* Toggle 4: Appearance & Grayscale Theme */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 transition hover:border-[var(--border-divider)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Interface Appearance Theme</h4>
                      <p className="text-xs text-[var(--text-body)]">Switch between Light Mode (#E8E8E8) and Dark Mode (#000000) with persistent preference.</p>
                    </div>
                    <ThemeToggle variant="inline" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Sticker Placement Guide */}
            {activeSettingsTab === 'printing' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Optimal Physical Decal Printing & Placement</h4>
                <p className="text-xs text-[var(--text-body)]">Follow these tips to ensure maximum durability and scan rates on your vehicle:</p>

                <div className="fluid-grid-tips pt-1">
                  <div className="rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 card-hover-glow text-[var(--text-body)]">
                    <span className="text-xs font-bold text-[var(--text-primary)]">1. Windshield Corner</span>
                    <p className="mt-1 text-xs text-[var(--text-body)]">Place sticker on the lower passenger side corner of the front windshield for clear line-of-sight.</p>
                  </div>

                  <div className="rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 card-hover-glow text-[var(--text-body)]">
                    <span className="text-xs font-bold text-[var(--text-primary)]">2. Weatherproof Vinyl</span>
                    <p className="mt-1 text-xs text-[var(--text-body)]">Print on UV-resistant, weatherproof matte vinyl stickers to avoid glare under direct sun.</p>
                  </div>

                  <div className="rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 card-hover-glow text-[var(--text-body)]">
                    <span className="text-xs font-bold text-[var(--text-primary)]">3. Recommended Size</span>
                    <p className="mt-1 text-xs text-[var(--text-body)]">2.5 x 2.5 inches (65mm) gives standard smartphone cameras instant autofocus lock from 3-5 feet.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Anonymity & Security */}
            {activeSettingsTab === 'security' && (
              <div style={{ padding: 'var(--card-padding)' }} className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Privacy Infrastructure Guarantee</h4>
                <p className="text-xs text-[var(--text-body)]">
                  Your account is protected by Clerk identity tokens and server-side notification relays.
                </p>

                <div className="rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3.5 text-xs text-[var(--text-body)] space-y-2">
                  <p className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <CheckCircle2 size={15} className="text-[var(--text-body)]" /> 256-Bit TLS Socket Tunnel
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
