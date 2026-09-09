import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Search, ShieldAlert, ShieldCheck, UserCheck, UserX, RefreshCw } from 'lucide-react'

export default function AdminUsers() {
  const { getToken } = useAuth()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
      const response = await fetch(`/api/admin/users?${query}`, {
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

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      fetchUsers(pagination.page)
    } catch (err) {
      alert(err.message)
    }
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

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div>}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-4">User / Email</th>
              <th className="px-6 py-4">Clerk ID</th>
              <th className="px-6 py-4">Vehicles Owned</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-medium text-white">{u.email}</td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{u.clerkId || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-400">
                      {u.vehiclesCount} vehicle{u.vehiclesCount === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : u.status === 'suspended'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.clerkId, 'active')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <UserCheck className="h-3 w-3" />
                          Activate
                        </button>
                      )}
                      {u.status !== 'suspended' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.clerkId, 'suspended')}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Suspend
                        </button>
                      )}
                      {u.status !== 'blocked' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.clerkId, 'blocked')}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-500/20"
                        >
                          <UserX className="h-3 w-3" />
                          Block
                        </button>
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
  )
}
