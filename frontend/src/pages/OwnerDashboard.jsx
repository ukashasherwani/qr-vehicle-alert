import { useCallback, useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { AlertCircle, CarFront, Plus, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { io } from 'socket.io-client'

const API_URL = '/api'
const SOCKET_URL = 'http://127.0.0.1:5000'

function statusClasses(status) {
  if (status === 'resolved') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'in-progress') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-rose-100 text-rose-700'
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
  const { isLoaded, isSignedIn, user } = useUser()
  const [vehicles, setVehicles] = useState([])
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ plateNumber: '', model: '' })
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
        fetch(`${API_URL}/vehicles/owner/${clerkId}`),
        fetch(`${API_URL}/alerts/owner/${clerkId}`),
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

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // The initial dashboard fetch synchronizes this view with the API.
      // oxlint-disable-next-line react/set-state-in-effect
      loadDashboard()
    }
  }, [isLoaded, isSignedIn, loadDashboard])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return undefined

    const socket = io(SOCKET_URL)
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

    socket.on('newAlert', handleNewAlert)

    return () => {
      socket.off('newAlert', handleNewAlert)
      socket.disconnect()
    }
  }, [isLoaded, isSignedIn, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ownerClerkId: user.id,
          ownerEmail: user.primaryEmailAddress?.emailAddress,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message || 'Unable to register vehicle.')
      }

      setForm({ plateNumber: '', model: '' })
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
    return <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading dashboard...</div>
  }

  if (!isSignedIn) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-slate-600">Sign in to manage your vehicles.</div>
  }

  return (
    <main className="min-h-[calc(100vh-81px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {toast && <div role="status" className="fixed right-4 top-24 z-20 rounded-lg border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 shadow-lg">{toast}</div>}
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Owner portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your vehicles</h1>
            <p className="mt-2 text-slate-600">Keep your QR codes ready and stay on top of incoming alerts.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CarFront className="text-cyan-700" size={20} />
              <h2 className="text-xl font-semibold text-slate-900">Registered vehicles</h2>
            </div>
            {vehicles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No vehicles registered yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map((vehicle) => {
                  const scanUrl = `${window.location.origin}/scan/${vehicle._id}`
                  return (
                    <article key={vehicle._id} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2">
                        <QRCodeCanvas value={scanUrl} size={112} level="M" includeMargin />
                      </div>
                      <div className="min-w-0 py-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</p>
                        <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{vehicle.plateNumber}</h3>
                        <p className="mt-1 text-sm text-slate-600">{vehicle.model || 'Model not provided'}</p>
                        <a className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/scan/${vehicle._id}`}>
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

          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Plus className="text-cyan-700" size={20} />
              <h2 className="text-xl font-semibold text-slate-900">Add vehicle</h2>
            </div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="plateNumber">Plate number</label>
            <input id="plateNumber" required value={form.plateNumber} onChange={(event) => setForm({ ...form, plateNumber: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="ABC 1234" />
            <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="model">Vehicle model</label>
            <input id="model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="Toyota Corolla" />
            <button disabled={isSaving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
              <Plus size={18} />
              {isSaving ? 'Registering...' : 'Register vehicle'}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="text-cyan-700" size={20} />
            <h2 className="text-xl font-semibold text-slate-900">Incoming alerts</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {alerts.length === 0 ? (
              <p className="p-6 text-slate-500">No alerts have been reported for your vehicles.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  (() => {
                    const alertContent = getAlertContent(alert)
                    return <article key={alert._id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{alertContent.title}</p>
                        {alertContent.message && <p className="mt-1 text-sm text-slate-600">{alertContent.message}</p>}
                      <p className="mt-2 text-xs text-slate-400">{alert.vehicleId?.plateNumber || 'Unknown vehicle'} · {new Date(alert.createdAt).toLocaleString()}</p>
                        {alert.imageUrl && <a href={alert.imageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block"><img src={alert.imageUrl} alt="Alert evidence" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-80" /></a>}
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses(alert.status)}`}>{alert.status || 'pending'}</span>
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
