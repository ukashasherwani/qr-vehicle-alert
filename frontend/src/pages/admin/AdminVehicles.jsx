import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Search, QrCode, RefreshCw, Power, RotateCcw } from 'lucide-react'

export default function AdminVehicles() {
  const { getToken } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [qrFilter, setQrFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchVehicles = async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const query = new URLSearchParams({
        page,
        limit: 10,
        search,
        qrStatus: qrFilter,
      })
      const response = await fetch(`/api/admin/vehicles?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch vehicles')
      setVehicles(result.data.vehicles)
      setPagination(result.data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles(1)
  }, [qrFilter])

  const handleUpdateQrStatus = async (vehicleId, qrStatus) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/qr-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrStatus }),
      })
      if (!response.ok) throw new Error('Failed to update QR code status')
      fetchVehicles(pagination.page)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Vehicles & QR Code Control</h2>
          <p className="mt-1 text-xs text-slate-400">Monitor vehicle registry and remotely manage QR sticker statuses.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchVehicles(pagination.page)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by license plate, vehicle model, owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVehicles(1)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={qrFilter}
          onChange={(e) => setQrFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All QR Statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-4">Plate Number</th>
              <th className="px-6 py-4">Model</th>
              <th className="px-6 py-4">Owner Email</th>
              <th className="px-6 py-4">QR Status</th>
              <th className="px-6 py-4">Total Alerts</th>
              <th className="px-6 py-4 text-right">QR Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading vehicles...</td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No vehicles registered.</td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v._id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-mono font-bold text-cyan-400">{v.plateNumber}</td>
                  <td className="px-6 py-4 font-medium text-white">{v.model || 'Unknown'}</td>
                  <td className="px-6 py-4 text-slate-400">{v.ownerEmail || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        v.qrStatus === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <QrCode className="h-3 w-3" />
                      {v.qrStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-semibold">{v.totalAlerts}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.qrStatus === 'active' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateQrStatus(v._id, 'deactivated')}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-500/20"
                        >
                          <Power className="h-3 w-3" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateQrStatus(v._id, 'active')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Power className="h-3 w-3" />
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUpdateQrStatus(v._id, 'regenerated')}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/20"
                        title="Regenerate QR Token"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Regenerate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
