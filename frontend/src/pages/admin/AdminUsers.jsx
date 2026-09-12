import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl } from '../../api/config'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShieldAlert, RefreshCw, X, LoaderCircle, Phone, Car, Bell, Copy, ChevronDown } from 'lucide-react'

export default function AdminUsers() {
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeAction, setActiveAction] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [openStatusMenu, setOpenStatusMenu] = useState(null)

  const fetchUsers = async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const query = new URLSearchParams({
        page,
        limit: 10,
        search,
        status: statusFilter,
      })
      const response = await fetch(apiUrl(`/admin/users?${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch users')
      setUsers(result.data.users)
      setPagination(result.data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1)
  }, [statusFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchUsers(1), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  const updateLocalStatus = (userId, status) => {
    setUsers((currentUsers) => currentUsers.map((user) => (
      user.clerkId === userId ? { ...user, status } : user
    )))
  }

  const handleUpdateStatus = async (userId, newStatus) => {
    const previousUser = users.find((user) => user.clerkId === userId)
    const actionKey = `${userId}:${newStatus}`
    setActionError('')
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    updateLocalStatus(userId, newStatus)
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/admin/users/${userId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Failed to update status')
    } catch (err) {
      if (previousUser) updateLocalStatus(userId, previousUser.status)
      setActionError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  const handleFlagOwner = async (userId) => {
    const previousUser = users.find((user) => user.clerkId === userId)
    const actionKey = `${userId}:flagged`
    setActionError('')
    setActiveAction((current) => ({ ...current, [actionKey]: true }))
    updateLocalStatus(userId, 'flagged')
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/admin/users/${userId}/flag`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Failed to flag owner')
    } catch (err) {
      if (previousUser) updateLocalStatus(userId, previousUser.status)
      setActionError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [actionKey]: false }))
    }
  }

  const handleStatusSelection = (userId, newStatus) => {
    setOpenStatusMenu(null)
    if (newStatus === 'flagged') {
      handleFlagOwner(userId)
      return
    }
    handleUpdateStatus(userId, newStatus)
  }

  const openUserDetails = async (user) => {
    setSelectedUser(user)
    setUserDetails(null)
    setIsDetailsLoading(true)
    try {
      const token = await getToken()
      const response = await fetch(apiUrl(`/admin/users/${user.clerkId}/details`), { headers: { Authorization: `Bearer ${token}` } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to load user details')
      setUserDetails(result.data)
    } catch (detailsError) {
      setActionError(detailsError.message)
    } finally {
      setIsDetailsLoading(false)
    }
  }

  const formatJoinedDate = (date) => date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'N/A'

  const copyPhoneNumber = async (phoneNumber) => {
    if (phoneNumber && phoneNumber !== 'N/A') await navigator.clipboard?.writeText(phoneNumber)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Registered Users Management</h2>
          <p className="mt-1 text-xs text-slate-400">Manage vehicle owners, registered accounts, and moderation status.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchUsers(pagination.page)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email, Clerk ID, or vehicle plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {(error || actionError) && <div role="alert" className="fixed bottom-5 right-5 z-40 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 shadow-xl">{error || actionError}</div>}

      {/* Users Table */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full min-w-[750px] whitespace-nowrap text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-4">User / Email</th>
              <th className="px-6 py-4">Clerk ID</th>
              <th className="px-6 py-4">Vehicles Owned</th>
              <th className="px-6 py-4">Phone Number</th>
              <th className="px-6 py-4">Alerts Received</th>
              <th className="px-6 py-4">Joined Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-slate-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-slate-400">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} onClick={() => openUserDetails(u)} className="cursor-pointer transition hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-white">{u.email}</td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{u.clerkId || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <Link onClick={(event) => event.stopPropagation()} to={`/admin/vehicles?owner=${encodeURIComponent(u.clerkId || u.email)}`} className="cursor-pointer rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-indigo-400 hover:underline">
                      {u.vehiclesCount} vehicle{u.vehiclesCount === 1 ? '' : 's'}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={(event) => { event.stopPropagation(); copyPhoneNumber(u.phoneNumber) }} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-300 hover:text-white">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{u.phoneNumber || 'N/A'}</span>
                      {u.phoneNumber && u.phoneNumber !== 'N/A' && <Copy className="h-3 w-3 text-slate-500" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">{u.alertsReceived ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-400">{formatJoinedDate(u.joinedAt)}</td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setOpenStatusMenu(openStatusMenu === u.clerkId ? null : u.clerkId) }} className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase transition hover:brightness-125 active:scale-95 ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : u.status === 'suspended' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {activeAction[`${u.clerkId}:${u.status}`] ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                        {u.status.toUpperCase()} <ChevronDown className="h-3 w-3" />
                      </button>
                      {openStatusMenu === u.clerkId && (
                        <div onClick={(event) => event.stopPropagation()} className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-white/10 bg-[#121215] p-1.5 shadow-2xl">
                          {[['suspended', 'Suspend'], ['blocked', 'Block'], ['flagged', 'Flag Account'], ['active', 'Mark Active']].map(([status, label]) => (
                            <button key={status} type="button" disabled={u.status === status || activeAction[`${u.clerkId}:${status}`]} onClick={() => handleStatusSelection(u.clerkId, status)} className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                              {label}
                              {activeAction[`${u.clerkId}:${status}`] && <RefreshCw className="h-3 w-3 animate-spin" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/60" onClick={() => setSelectedUser(null)}>
          <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#121215] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">User details</p>
                <div className="mt-3 flex items-center gap-3">
                  {userDetails?.profileImageUrl ? <img src={userDetails.profileImageUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">{selectedUser.email?.charAt(0).toUpperCase()}</div>}
                  <div>
                <h3 className="mt-1 text-xl font-bold text-white">{selectedUser.email}</h3>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white active:scale-95"><X className="h-5 w-5" /></button>
            </div>
            {isDetailsLoading ? <div className="flex items-center gap-2 py-10 text-sm text-slate-400"><LoaderCircle className="animate-spin" /> Loading details...</div> : userDetails && (
              <div className="mt-6 space-y-6 text-sm">
                <div className="space-y-2 text-slate-300"><p><Phone className="mr-2 inline h-4 w-4" />{userDetails.phoneNumber}</p><p>Clerk ID: <span className="font-mono text-slate-400">{selectedUser.clerkId}</span></p></div>
                <div><h4 className="mb-2 font-semibold text-white">Registered vehicles</h4><div className="space-y-2">{userDetails.vehicles.map((vehicle) => <div key={vehicle._id} className="rounded-xl border border-white/10 bg-white/5 p-3"><Car className="mr-2 inline h-4 w-4" />{vehicle.plateNumber} <span className="text-slate-400">{vehicle.model || 'Model not provided'}</span></div>)}</div></div>
                <div><h4 className="mb-2 font-semibold text-white">Recent alerts</h4><div className="space-y-2">{userDetails.alerts.length ? userDetails.alerts.map((alert) => <div key={alert._id} className="rounded-xl border border-white/10 bg-white/5 p-3"><Bell className="mr-2 inline h-4 w-4" />{alert.issueType} <span className="text-slate-400">{alert.status} · {new Date(alert.createdAt).toLocaleDateString()}</span></div>) : <p className="text-slate-400">No recent alerts.</p>}</div></div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
