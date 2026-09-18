import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl, BACKEND_URL } from '../../api/config'
import { io } from 'socket.io-client'
import { AlertTriangle, MapPin, RefreshCw, Calendar, Car, Check, X } from 'lucide-react'

export default function AdminSosLogs() {
  const { getToken } = useAuth()
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeAction, setActiveAction] = useState({})
  const [liveSos, setLiveSos] = useState(null)

  const fetchLogs = async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/admin/sos-logs?page=${page}&limit=12`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch SOS logs')
      setLogs(result.data.logs)
      setPagination(result.data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1)
  }, [])

  useEffect(() => {
    const socket = io(BACKEND_URL)
    const handleNewSos = ({ alert }) => {
      const nextLog = {
        id: alert._id,
        vehicle: alert.vehicleId,
        issueType: alert.issueType || 'CRITICAL_SOS',
        message: alert.message,
        urgency: alert.urgency,
        status: alert.status,
        coordinates: alert.coordinates,
        createdAt: alert.createdAt,
      }
      setLogs((current) => [nextLog, ...current.filter((log) => String(log.id) !== String(nextLog.id))])
      setPagination((current) => ({ ...current, total: current.total + 1 }))
      setLiveSos(nextLog)
      window.setTimeout(() => setLiveSos(null), 7000)
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        oscillator.frequency.value = 880
        gain.gain.value = 0.08
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.25)
      } catch {
        // Browsers can block audio until the admin interacts with the page.
      }
    }
    const handleSosUpdate = ({ alert }) => {
      setLogs((current) => current.map((log) => String(log.id) === String(alert._id) ? { ...log, status: alert.status } : log))
    }
    socket.on('sosEmergencyAlert', handleNewSos)
    socket.on('sosAlertUpdated', handleSosUpdate)
    return () => socket.disconnect()
  }, [])

  const updateSosStatus = async (id, status) => {
    const actionKey = `${id}:${status}`
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    const previousLogs = logs
    setLogs((current) => current.map((log) => String(log.id) === String(id) ? { ...log, status } : log))
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/sos/${id}/resolve`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to update SOS status')
    } catch (actionError) {
      setLogs(previousLogs)
      setError(actionError.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {liveSos && (
        <div role="alert" className="animate-pulse rounded-xl border border-red-400/60 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.22)]">
          CRITICAL SOS: {liveSos.vehicle?.plateNumber || 'Vehicle'} requires immediate attention.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Emergency SOS Incident Logs</h2>
          <p className="mt-1 text-xs text-slate-400">High-priority alerts with location coordinates, timestamps, and details.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(pagination.page)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            Loading emergency SOS records...
          </div>
        ) : logs.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            No emergency SOS incidents logged.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col justify-between rounded-2xl border border-rose-900/30 bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{log.issueType}</h3>
                      <p className="text-[11px] text-rose-400 uppercase font-medium">Urgency: {log.urgency}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 capitalize">
                    {log.status}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300">
                  {log.message || 'No additional message text attached.'}
                </div>

                <div className="mt-3 grid gap-1 text-xs text-slate-400">
                  <p>Owner: <span className="text-slate-200">{log.ownerPhone || log.vehicle?.ownerPhone || 'Phone unavailable'}</span></p>
                  <p>Email: <span className="text-slate-200">{log.ownerEmail || log.vehicle?.ownerEmail || 'Email unavailable'}</span></p>
                  {log.coordinates?.latitude != null && log.coordinates?.longitude != null && (
                    <a href={`https://www.google.com/maps?q=${log.coordinates.latitude},${log.coordinates.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-200 underline hover:text-white">
                      <MapPin className="h-3.5 w-3.5" /> {log.coordinates.latitude}, {log.coordinates.longitude}
                    </a>
                  )}
                </div>

                {log.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={log.imageUrl}
                      alt="SOS Evidence"
                      className="h-32 w-full rounded-lg object-cover border border-slate-800"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-mono text-slate-200">{log.vehicle?.plateNumber || 'Vehicle'}</span>
                  <span>({log.vehicle?.model || 'Unknown'})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {log.status === 'active' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => updateSosStatus(log.id, 'resolved')} disabled={activeAction[`${log.id}:resolved`]} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50"><Check size={14} /> Resolved</button>
                  <button type="button" onClick={() => updateSosStatus(log.id, 'dismissed')} disabled={activeAction[`${log.id}:dismissed`]} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"><X size={14} /> Dismissed</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
