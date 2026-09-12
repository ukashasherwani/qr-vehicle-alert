import { useCallback, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { AlertCircle, CarFront, Check, Plus, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { io } from 'socket.io-client'
import { apiUrl, socketUrl } from '../api/config'

function statusClasses(status) {
  if (status === 'resolved') {
    return 'bg-[#10b981]/10 text-[#10b981]'
  }

  if (status === 'in-progress') {
    return 'bg-[#f59e0b]/10 text-[#f59e0b]'
  }

  return 'bg-[#ef4444]/10 text-[#ef4444]'
}

function urgencyClasses(urgency) {
  if (urgency === 'high') {
    return 'animate-pulse bg-[#ef4444]/10 text-[#ef4444]'
  }

  if (urgency === 'medium') {
    return 'bg-[#f59e0b]/10 text-[#f59e0b]'
  }

  return 'bg-white/10 text-white/60'
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

    const socket = io(socketUrl)
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
    return <div className="mx-auto max-w-6xl px-6 py-16 text-white/50">Loading dashboard...</div>
  }

  if (!isSignedIn) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-white/60">Sign in to manage your vehicles.</div>
  }

  return (
    <main className="min-h-[calc(100vh-81px)] bg-[#0a0a0c] px-4 py-8 text-white sm:px-6 lg:px-8">
      {toast && <div role="status" className="fixed right-4 top-24 z-20 rounded-lg border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 shadow-lg">{toast}</div>}
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="animate-rise-in">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Owner portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Your vehicles</h1>
            <p className="mt-2 text-white/60">Keep your QR codes ready and stay on top of incoming alerts.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && <p className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">{error}</p>}
        {success && <p className="rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 text-sm text-[#10b981]">{success}</p>}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CarFront className="text-white" size={20} />
              <h2 className="text-xl font-semibold text-white">Registered vehicles</h2>
            </div>
            {vehicles.length === 0 ? (
              <div className="glass-card rounded-2xl border-dashed p-8 text-center text-white/50">
                No vehicles registered yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map((vehicle) => {
                  const scanUrl = `${window.location.origin}/scan/${vehicle._id}`
                  return (
                    <article key={vehicle._id} className="glass-card animate-rise-in flex gap-5 rounded-2xl p-5">
                      <div className="shrink-0 rounded-lg border border-white/10 bg-white p-2">
                        <QRCodeCanvas value={scanUrl} size={112} level="M" includeMargin />
                      </div>
                      <div className="min-w-0 py-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Vehicle</p>
                        <h3 className="mt-1 truncate text-lg font-bold text-white">{vehicle.plateNumber}</h3>
                        <p className="mt-1 text-sm text-white/60">{vehicle.model || 'Model not provided'}</p>
                        <a className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white" href={`/scan/${vehicle._id}`}>
                          <QrCode size={15} />
                          Open scan page
                        </a>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="glass-card animate-rise-in rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-2">
              <Plus className="text-white" size={20} />
              <h2 className="text-xl font-semibold text-white">Add vehicle</h2>
            </div>
            <label className="block text-sm font-semibold text-white/80" htmlFor="plateNumber">Plate number</label>
            <input id="plateNumber" required value={form.plateNumber} onChange={(event) => setForm({ ...form, plateNumber: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-1 focus:ring-white/50" placeholder="ABC 1234" />
            <label className="mt-4 block text-sm font-semibold text-white/80" htmlFor="model">Vehicle model</label>
            <input id="model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-1 focus:ring-white/50" placeholder="Toyota Corolla" />
            <label className="mt-4 block text-sm font-semibold text-white/80" htmlFor="ownerPhone">Owner phone number</label>
            <input id="ownerPhone" required value={form.ownerPhone} onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-1 focus:ring-white/50" placeholder="+923001234567" type="tel" />
            <button disabled={isSaving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
              <Plus size={18} />
              {isSaving ? 'Registering...' : 'Register vehicle'}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="text-white" size={20} />
            <h2 className="text-xl font-semibold text-white">Incoming alerts</h2>
          </div>
          <div className="glass-card overflow-hidden rounded-2xl">
            {alerts.length === 0 ? (
              <p className="p-6 text-white/50">No alerts have been reported for your vehicles.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {alerts.map((alert) => (
                  (() => {
                    const alertContent = getAlertContent(alert)
                    return <article key={alert._id} className="animate-rise-in flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{alertContent.title}</p>
                        {alertContent.message && <p className="mt-1 text-sm text-white/60">{alertContent.message}</p>}
                      <p className="mt-2 text-xs text-white/40">{alert.vehicleId?.plateNumber || 'Unknown vehicle'} · {new Date(alert.createdAt).toLocaleString()}</p>
                        {alert.imageUrl && <a href={alert.imageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block"><img src={alert.imageUrl} alt="Alert evidence" className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10 transition hover:opacity-80" /></a>}
                      </div>
                      <div className="flex w-fit shrink-0 flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${urgencyClasses(alert.urgency)}`}>{alert.urgency || 'low'} urgency</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses(alert.status)}`}>{alert.status || 'pending'}</span>
                        {(alert.status || 'pending') === 'pending' && (
                          <button type="button" onClick={() => handleResolveAlert(alert._id)} className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white px-3 py-1 text-xs font-bold text-black transition hover:bg-white/85">
                            <Check size={13} /> Mark as Resolved
                          </button>
                        )}
                      </div>
                    </article>
                  })()
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default OwnerDashboard
