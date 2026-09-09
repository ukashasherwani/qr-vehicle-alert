import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Search, Sparkles, MessageSquare, RefreshCw, Car } from 'lucide-react'

export default function AdminMessages() {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMessages = async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getToken()
      const query = new URLSearchParams({
        page,
        limit: 12,
        search,
        urgency: urgencyFilter,
      })
      const response = await fetch(`/api/admin/messages?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Failed to fetch messages')
      setMessages(result.data.messages)
      setPagination(result.data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages(1)
  }, [urgencyFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Message Moderation & AI Sentiment</h2>
          <p className="mt-1 text-xs text-slate-400">Review scan messages, AI sentiment classifications, and moderation logs.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchMessages(pagination.page)}
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
            placeholder="Search keywords or message content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMessages(1)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Urgencies</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            Loading message logs...
          </div>
        ) : messages.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            No message records found.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {m.issueType}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                    <Sparkles className="h-3 w-3" />
                    <span>{m.aiSentimentAnalysis?.sentiment}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-200">
                  {m.message ? `"${m.message}"` : <span className="italic text-slate-500">No message provided</span>}
                </p>

                {m.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={m.imageUrl}
                      alt="Alert visual"
                      className="h-28 w-full rounded-lg object-cover border border-slate-800"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-slate-300">{m.vehicle?.plateNumber || 'Vehicle'}</span>
                </div>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
