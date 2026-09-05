import { useEffect, useState } from 'react'
import { AlertTriangle, Check, LoaderCircle, Send } from 'lucide-react'
import { useParams } from 'react-router-dom'

const API_URL = '/api'
const ISSUE_TYPES = ['Path Blocked', 'Lights On', 'Window Open', 'Custom']

function PublicScan() {
  const { vehicleId } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const response = await fetch(`${API_URL}/vehicles/${vehicleId}`)
        if (!response.ok) throw new Error('Vehicle not found.')
        setVehicle(await response.json())
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadVehicle()
  }, [vehicleId])

  const toggleIssue = (issue) => {
    setSelectedIssues((current) => current.includes(issue)
      ? current.filter((item) => item !== issue)
      : [...current, issue])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          issueType: selectedIssues.filter((issue) => issue !== 'Custom').join(', ') || 'Custom',
          message,
          ownerEmail: vehicle.ownerEmail,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message || 'Unable to send alert.')
      }

      setSelectedIssues([])
      setMessage('')
      setSuccess(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-81px)] items-center justify-center gap-2 bg-slate-950 text-slate-300"><LoaderCircle className="animate-spin" size={20} /> Loading vehicle...</div>
  }

  if (!vehicle) {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><AlertTriangle className="mx-auto text-rose-500" size={32} /><h1 className="mt-4 text-2xl font-bold text-slate-900">Vehicle unavailable</h1><p className="mt-2 text-slate-600">{error}</p></div>
  }

  return (
    <main className="min-h-[calc(100vh-81px)] bg-slate-950 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Vehicle contact</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{vehicle.plateNumber}</h1>
          <p className="mt-2 text-slate-600">{vehicle.model || 'Vehicle model not provided'}</p>

          <div className="my-8 h-px bg-slate-200" />
          <h2 className="text-xl font-bold text-slate-900">Report an issue</h2>
          <p className="mt-2 text-sm text-slate-600">Select everything that applies. The owner will be notified privately.</p>

          <form onSubmit={handleSubmit} className="mt-6">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">What needs attention?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ISSUE_TYPES.map((issue) => (
                  <label key={issue} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition ${selectedIssues.includes(issue) ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={selectedIssues.includes(issue)} onChange={() => toggleIssue(issue)} className="h-4 w-4 accent-cyan-700" />
                    {issue}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="message">Additional message</label>
            <textarea id="message" rows="4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add helpful details for the owner..." className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />

            {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check size={17} /> Alert sent to the vehicle owner.</p>}

            <button type="submit" disabled={isSubmitting || selectedIssues.length === 0} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              <Send size={18} />
              {isSubmitting ? 'Sending alert...' : 'Send alert'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default PublicScan
