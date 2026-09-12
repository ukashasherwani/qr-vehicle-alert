import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, LoaderCircle, Send, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../api/config'

const ISSUE_TYPES = ['Path Blocked', 'Lights On', 'Window Open', 'Custom']

function PublicScan() {
  const { vehicleId } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const imagePreviewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
  }, [imagePreviewUrl])

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const response = await fetch(apiUrl(`/vehicles/${vehicleId}`))
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
    if (issue === 'Custom') {
      setSelectedIssues((current) => current.includes('Custom') ? [] : ['Custom'])
      return
    }

    setSelectedIssues((current) => [
      ...current.filter((item) => item !== 'Custom' && item !== issue),
      ...(current.includes(issue) ? [] : [issue]),
    ])
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (selectedIssues.includes('Custom') && !message.trim()) {
      setError('Please enter an additional message for a custom alert.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(apiUrl('/alerts'), {
        method: 'POST',
        body: (() => {
          const formData = new FormData()
          formData.append('vehicleId', vehicleId)
          formData.append('issueType', selectedIssues.filter((issue) => issue !== 'Custom').join(', ') || 'Custom')
          formData.append('message', message)
          formData.append('ownerEmail', vehicle.ownerEmail || '')
          if (image) formData.append('image', image)
          return formData
        })(),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        if (response.status === 429) {
          throw new Error('You have reached the alert submission limit. Please try again in 15 minutes.')
        }
        throw new Error(body.message || 'Unable to send alert.')
      }

      setSelectedIssues([])
      setMessage('')
      setImage(null)
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
    return <div className="mx-auto max-w-xl px-6 py-20 text-center text-white"><AlertTriangle className="mx-auto text-[#ef4444]" size={32} /><h1 className="mt-4 text-2xl font-bold">Vehicle unavailable</h1><p className="mt-2 text-white/60">{error}</p></div>
  }

  return (
    <main className="min-h-[calc(100vh-81px)] bg-[#0a0a0c] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="glass-card animate-rise-in rounded-2xl p-6 sm:p-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white">
                <ShieldCheck size={21} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">QR Vehicle Alert Service</h1>
                <p className="mt-1.5 text-sm leading-6 text-white/60">
                  You are notifying the vehicle owner privately and securely. Select an issue below or type a custom message. No account required, and the owner will be notified instantly.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Vehicle contact</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{vehicle.plateNumber}</h1>
          <p className="mt-2 text-white/60">{vehicle.model || 'Vehicle model not provided'}</p>

          <div className="my-8 h-px bg-slate-200" />
          <h2 className="text-xl font-bold text-white">Report an issue</h2>
          <p className="mt-2 text-sm text-white/60">Select everything that applies. The owner will be notified privately.</p>

          <form onSubmit={handleSubmit} className="mt-6 pb-6">
            <fieldset>
              <legend className="text-sm font-semibold text-white/80">What needs attention?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ISSUE_TYPES.map((issue) => (
                  <label key={issue} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition hover:border-white/30 ${selectedIssues.includes(issue) ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/70'}`}>
                    <input type="checkbox" checked={selectedIssues.includes(issue)} onChange={() => toggleIssue(issue)} className="h-4 w-4 accent-white" />
                    {issue}
                  </label>
                ))}
              </div>
            </fieldset>

            {selectedIssues.includes('Custom') && (
              <>
                <label className="mt-6 block text-sm font-semibold text-white/80" htmlFor="message">Additional message</label>
                <textarea id="message" required rows="4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add helpful details for the owner..." className="mt-2 mb-2 min-h-32 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-3 pb-4 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-1 focus:ring-white/50" />
              </>
            )}

            <label className="mt-6 block text-sm font-semibold text-white/80" htmlFor="image">Photo evidence <span className="font-normal text-white/40">(optional)</span></label>
            <input id="image" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block min-h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 text-sm text-white/60 file:mr-4 file:min-h-12 file:border-0 file:bg-white/10 file:px-4 file:py-3 file:font-semibold file:text-white hover:border-white/30" />
            {imagePreviewUrl && <img src={imagePreviewUrl} alt="Selected evidence preview" className="mt-3 h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />}

            {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 text-sm text-[#10b981]"><Check size={17} /> Alert sent to the vehicle owner.</p>}

            <button type="submit" disabled={isSubmitting || selectedIssues.length === 0} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40">
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
