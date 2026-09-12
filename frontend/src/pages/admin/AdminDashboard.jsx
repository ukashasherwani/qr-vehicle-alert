import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl } from '../../api/config'
import { Link } from 'react-router-dom'
import {
  Users,
  QrCode,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const response = await fetch(apiUrl('/admin/stats'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch admin statistics')
      setStats(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Analytics Overview</h2>
          <p className="mt-1 text-xs text-slate-400">
            Real-time status of QR Vehicle Alert network and message sentiment breakdown.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Link to="/admin/users" className="cursor-pointer rounded-2xl border border-white/10 bg-[#121215] p-5 transition-transform hover:-translate-y-1 active:scale-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Registered Owners</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {isLoading ? '...' : stats?.totalUsers ?? 0}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Active Vehicle Owners</span>
          </div>
        </Link>

        {/* Active QR Codes */}
        <Link to="/admin/vehicles" className="cursor-pointer rounded-2xl border border-white/10 bg-[#121215] p-5 transition-transform hover:-translate-y-1 active:scale-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active QR Codes</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {isLoading ? '...' : stats?.activeQrCodes ?? 0}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Out of {stats?.totalVehicles ?? 0} total vehicles</span>
          </div>
        </Link>

        {/* SOS Alerts Today */}
        <Link to="/admin/sos-logs" className="cursor-pointer rounded-2xl border border-white/10 bg-[#121215] p-5 transition-transform hover:-translate-y-1 active:scale-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Emergency SOS Today</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {isLoading ? '...' : stats?.sosAlertsToday ?? 0}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400 font-medium">
            <span>High Priority Emergencies</span>
          </div>
        </Link>

        {/* Total Message Volume */}
        <Link to="/admin/messages" className="cursor-pointer rounded-2xl border border-white/10 bg-[#121215] p-5 transition-transform hover:-translate-y-1 active:scale-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Alerts Processed</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {isLoading ? '...' : stats?.totalAlerts ?? 0}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
            <span>All Historical Reports</span>
          </div>
        </Link>
      </div>

      {/* AI Tone Breakdown Section */}
      <div className="rounded-2xl border border-white/10 bg-[#121215] p-6">
        <h3 className="text-base font-semibold text-white">AI Urgency & Tone Analysis Distribution</h3>
        <p className="mt-1 text-xs text-slate-400">
          AI sentiment classification analyzed through Google Gemini urgency engine.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/messages?urgency=low" className="cursor-pointer rounded-xl border border-white/10 bg-[#0a0a0c] p-4 transition-transform hover:-translate-y-1 active:scale-95">
            <span className="text-xs font-medium text-slate-400">Helpful / Low Urgency</span>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {isLoading ? '...' : stats?.aiToneBreakdown?.Helpful ?? 0}
            </p>
          </Link>

          <Link to="/admin/messages?urgency=medium" className="cursor-pointer rounded-xl border border-white/10 bg-[#0a0a0c] p-4 transition-transform hover:-translate-y-1 active:scale-95">
            <span className="text-xs font-medium text-slate-400">Medium Caution Alert</span>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {isLoading ? '...' : stats?.aiToneBreakdown?.Alert ?? 0}
            </p>
          </Link>

          <Link to="/admin/messages?urgency=high" className="cursor-pointer rounded-xl border border-white/10 bg-[#0a0a0c] p-4 transition-transform hover:-translate-y-1 active:scale-95">
            <span className="text-xs font-medium text-slate-400">Urgent Emergency</span>
            <p className="mt-2 text-2xl font-bold text-rose-400">
              {isLoading ? '...' : stats?.aiToneBreakdown?.Urgent ?? 0}
            </p>
          </Link>

          <Link to="/admin/messages?status=spam" className="cursor-pointer rounded-xl border border-white/10 bg-[#0a0a0c] p-4 transition-transform hover:-translate-y-1 active:scale-95">
            <span className="text-xs font-medium text-slate-400">Blocked / Flagged Spam</span>
            <p className="mt-2 text-2xl font-bold text-slate-400">
              {isLoading ? '...' : stats?.aiToneBreakdown?.Spam ?? 0}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
