import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiUrl } from '../../api/config'
import { socketUrl } from '../../api/config'
import { Search, Sparkles, MessageSquare, RefreshCw, Car, Check, Trash2, WandSparkles } from 'lucide-react'
import { io } from 'socket.io-client'
import { useSearchParams } from 'react-router-dom'

export default function AdminMessages() {
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState(() => searchParams.get('urgency') || 'all')
  const [statusFilter] = useState(() => searchParams.get('status') || 'all')
  const plateFilter = searchParams.get('plate') || ''
  const [queueFilter, setQueueFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeAction, setActiveAction] = useState({})

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
        status: statusFilter,
        plate: plateFilter,
      })
      const response = await fetch(apiUrl(`/admin/messages?${query}`), {
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

  useEffect(() => {
    const nextUrgency = searchParams.get('urgency') || 'all'
    setUrgencyFilter(nextUrgency)
  }, [searchParams])

  const mergeAlert = (updatedAlert) => {
    const updatedId = updatedAlert?._id || updatedAlert?.id
    if (!updatedId) return

    setMessages((currentMessages) => currentMessages.map((message) => (
      String(message.id) === String(updatedId)
        ? {
            ...message,
            urgency: updatedAlert.urgency || message.urgency,
            status: updatedAlert.status || message.status || message.moderationStatus || 'pending',
            moderationStatus: updatedAlert.status || message.status || message.moderationStatus || 'pending',
            vehicle: updatedAlert.vehicleId || message.vehicle,
            aiSentimentAnalysis: {
              ...message.aiSentimentAnalysis,
              urgency: updatedAlert.urgency || message.urgency,
            },
          }
        : message
    )))
  }

  useEffect(() => {
    const socket = io(socketUrl)
    const handleAlertUpdated = ({ alert }) => mergeAlert(alert)
    const handleAlertDeleted = ({ alertId }) => {
      setMessages((currentMessages) => currentMessages.filter((message) => String(message.id) !== String(alertId)))
    }
    socket.on('alertUpdated', handleAlertUpdated)
    socket.on('alertStatusChanged', handleAlertUpdated)
    socket.on('alertDeleted', handleAlertDeleted)
    return () => socket.disconnect()
  }, [])

  const getActionKey = (alertId, action) => `${alertId}:${action}`

  const handleAlertAction = async (alertId, action) => {
    setActionError('')
    setActiveAction((current) => ({ ...current, [getActionKey(alertId, action)]: true }))
    const previousMessages = messages

    if (action === 'resolve') {
      setMessages((currentMessages) => currentMessages.map((message) => (
        message.id === alertId ? { ...message, status: 'resolved', moderationStatus: 'resolved' } : message
      )))
    } else if (action === 'delete') {
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== alertId))
    }

    try {
      const token = await getToken()
      const options = { headers: { Authorization: `Bearer ${token}` } }
      let endpoint = `/alerts/${alertId}`
      if (action === 'resolve') {
        endpoint += '/status'
        options.method = 'PATCH'
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify({ status: 'resolved' })
      } else if (action === 'reanalyze') {
        endpoint += '/reanalyze'
        options.method = 'POST'
      } else {
        options.method = 'DELETE'
      }
      const response = await fetch(apiUrl(endpoint), options)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Alert action failed')
      if (action === 'resolve') mergeAlert({ ...result.data, status: 'resolved' })
      if (action === 'reanalyze') mergeAlert(result.data)
    } catch (err) {
      setMessages(previousMessages)
      setActionError(err.message)
    } finally {
      setActiveAction((current) => ({ ...current, [getActionKey(alertId, action)]: false }))
    }
  }

  const visibleMessages = messages.filter((message) => {
    const status = (message.status || message.moderationStatus || 'pending').toLowerCase()
    return queueFilter === 'all' || status === queueFilter
  })

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
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-95"
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

      {(error || actionError) && <div role="alert" className="fixed bottom-5 right-5 z-30 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 shadow-xl">{error || actionError}</div>}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3" role="tablist" aria-label="Alert queue filters">
        {[['all', 'All Messages'], ['pending', 'Pending'], ['resolved', 'Resolved']].map(([filter, label]) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={queueFilter === filter}
            onClick={() => setQueueFilter(filter)}
            className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition active:scale-95 ${queueFilter === filter ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            Loading message logs...
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            No message records found.
          </div>
        ) : (
          visibleMessages.map((m) => {
            const alertStatus = (m.status || m.moderationStatus || 'pending').toLowerCase()
            return (
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
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${alertStatus === 'resolved' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-400' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}>
                    {alertStatus === 'resolved' ? 'Resolved' : 'Pending'}
                  </span>
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

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800/80 pt-3">
                {alertStatus === 'resolved' ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3 w-3" /> Resolved
                  </span>
                ) : (
                  <button type="button" disabled={activeAction[getActionKey(m.id, 'resolve')]} onClick={() => handleAlertAction(m.id, 'resolve')} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-60">
                    {activeAction[getActionKey(m.id, 'resolve')] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Mark Resolved
                  </button>
                )}
                <button type="button" disabled={activeAction[getActionKey(m.id, 'delete')]} onClick={() => handleAlertAction(m.id, 'delete')} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-400 transition hover:bg-rose-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-60">
                  {activeAction[getActionKey(m.id, 'delete')] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Dismiss / Delete
                </button>
                <button type="button" disabled={activeAction[getActionKey(m.id, 'reanalyze')]} onClick={() => handleAlertAction(m.id, 'reanalyze')} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20 active:scale-95 disabled:cursor-wait disabled:opacity-60">
                  {activeAction[getActionKey(m.id, 'reanalyze')] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <WandSparkles className="h-3 w-3" />} Re-analyze Urgency
                </button>
              </div>
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}
