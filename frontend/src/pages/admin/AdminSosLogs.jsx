import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl } from '../../api/config'
import { AlertTriangle, MapPin, RefreshCw, Calendar, Car } from 'lucide-react'

export default function AdminSosLogs() {
  const { getToken } = useAuth()
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-6">
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}
