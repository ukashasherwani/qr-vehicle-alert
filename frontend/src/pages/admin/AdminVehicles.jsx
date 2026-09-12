import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl } from '../../api/config'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Search, QrCode, RefreshCw, ChevronDown } from 'lucide-react'

export default function AdminVehicles() {
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const [vehicles, setVehicles] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [qrFilter, setQrFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [openStatusMenu, setOpenStatusMenu] = useState(null)
  const [activeAction, setActiveAction] = useState({})

  const fetchVehicles = async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const query = new URLSearchParams({
        page,
        limit: 10,
        search,
        qrStatus: qrFilter === 'all' ? 'all' : qrFilter.toUpperCase(),
      })
      const owner = searchParams.get('owner')
      if (owner) query.set('owner', owner)
      const response = await fetch(apiUrl(`/admin/vehicles?${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch vehicles')
      setVehicles(result.data.vehicles.map((vehicle) => ({
        ...vehicle,
        qrStatus: vehicle.qrStatus?.toUpperCase() || 'ACTIVE',
        ownerPhone: vehicle.ownerPhone || 'N/A',
        alertCount: vehicle.alertCount ?? vehicle.totalAlerts ?? 0,
      })))
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

  const updateLocalVehicle = (vehicleId, changes) => {
    setVehicles((currentVehicles) => currentVehicles.map((vehicle) => (
      vehicle._id === vehicleId ? { ...vehicle, ...changes } : vehicle
    )))
  }

  const handleUpdateQrStatus = async (vehicleId, qrStatus) => {
    const vehicle = vehicles.find((item) => item._id === vehicleId)
    const actionKey = `${vehicleId}:${qrStatus}`
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    updateLocalVehicle(vehicleId, { qrStatus })
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/vehicles/${vehicleId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrStatus }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Failed to update QR code status')
    } catch (err) {
      if (vehicle) updateLocalVehicle(vehicleId, { qrStatus: vehicle.qrStatus })
      setError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  const handleRegenerateToken = async (vehicleId) => {
    const actionKey = `${vehicleId}:regenerate`
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/vehicles/${vehicleId}/regenerate`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Failed to regenerate QR token')
      updateLocalVehicle(vehicleId, { qrStatus: 'ACTIVE', qrToken: result.data?.qrToken })
    } catch (err) {
      setError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    const actionKey = `${vehicleId}:delete`
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    const previousVehicles = vehicles
    setVehicles((currentVehicles) => currentVehicles.filter((vehicle) => vehicle._id !== vehicleId))
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/vehicles/${vehicleId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Failed to delete vehicle')
    } catch (err) {
      setVehicles(previousVehicles)
      setError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  const handleStatusAction = (vehicleId, action) => {
    setOpenStatusMenu(null)
    if (action === 'delete') {
      handleDeleteVehicle(vehicleId)
    } else if (action === 'regenerate') {
      handleRegenerateToken(vehicleId)
    } else {
      handleUpdateQrStatus(vehicleId, action)
    }
  }

  const visibleVehicles = vehicles.filter((vehicle) => (
    qrFilter === 'all' || vehicle.qrStatus?.toUpperCase() === qrFilter.toUpperCase()
  ))

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

      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full min-w-[800px] whitespace-nowrap text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-4">Plate Number</th>
              <th className="px-6 py-4">Model</th>
              <th className="px-6 py-4">Owner Email</th>
              <th className="px-6 py-4">Owner Phone</th>
              <th className="px-6 py-4">QR Status</th>
              <th className="px-6 py-4">Total Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading vehicles...</td>
              </tr>
            ) : visibleVehicles.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No vehicles registered.</td>
              </tr>
            ) : (
              visibleVehicles.map((v) => (
                <tr key={v._id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-mono font-bold text-cyan-400">{v.plateNumber}</td>
                  <td className="px-6 py-4 font-medium text-white">{v.model || 'Unknown'}</td>
                  <td className="px-6 py-4"><Link to={`/admin/users?search=${encodeURIComponent(v.ownerEmail || '')}`} className="cursor-pointer text-indigo-400 hover:underline">{v.ownerEmail || 'N/A'}</Link></td>
                  <td className="px-6 py-4 text-slate-400">{v.ownerPhone || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <button type="button" onClick={() => setOpenStatusMenu(openStatusMenu === v._id ? null : v._id)} className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase transition hover:brightness-125 active:scale-95 ${v.qrStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {activeAction[`${v._id}:${v.qrStatus}`] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3" />}
                        {v.qrStatus} <ChevronDown className="h-3 w-3" />
                      </button>
                      {openStatusMenu === v._id && <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-[#121215] p-1.5 shadow-2xl">
                        {[['INACTIVE', 'Deactivate QR'], ['ACTIVE', 'Activate QR'], ['regenerate', 'Regenerate Token'], ['delete', 'Delete Vehicle']].map(([action, label]) => <button key={action} type="button" onClick={() => handleStatusAction(v._id, action)} disabled={(action === v.qrStatus) || activeAction[`${v._id}:${action}`]} className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">{label}{activeAction[`${v._id}:${action}`] && <RefreshCw className="h-3 w-3 animate-spin" />}</button>)}
                      </div>}
                    </div>
                  </td>
                  <td className="px-6 py-4"><Link to={`/admin/messages?plate=${encodeURIComponent(v.plateNumber)}`} className="cursor-pointer font-semibold text-indigo-400 hover:underline">{v.alertCount ?? v.totalAlerts ?? 0}</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
