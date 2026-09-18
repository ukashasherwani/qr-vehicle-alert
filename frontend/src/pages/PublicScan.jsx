import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, LoaderCircle, Send, ShieldCheck, Siren, X } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../api/config'

const ISSUE_TYPES = ['SOS Emergency', 'Path Blocked', 'Lights On', 'Window Open', 'Custom']

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
  const [showSosConfirm, setShowSosConfirm] = useState(false)
  const [sosNote, setSosNote] = useState('')
  const [sosFeedback, setSosFeedback] = useState('')
  // ukasha
  const [isSosSubmitting, setIsSosSubmitting] = useState(false)

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

  const triggerSos = () => {
    setSosFeedback('')
    if (!navigator.geolocation) {
      setShowSosConfirm(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => setShowSosConfirm(true),
      () => setShowSosConfirm(true),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const confirmSos = () => {
    setIsSosSubmitting(true)
    setSosFeedback('Emergency dispatch triggered!')
    setShowSosConfirm(false)

    const submitSos = (location = {}) => fetch(apiUrl('/sos/trigger'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId,
        vehiclePlate: vehicle.plateNumber,
        latitude: location.latitude,
        longitude: location.longitude,
        userNote: sosNote,
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to trigger emergency SOS.')
    })

    const onFailure = (sosError) => {
      setSosFeedback(sosError.message)
      setIsSosSubmitting(false)
    }
    const onSuccess = () => {
      setSosNote('')
      setIsSosSubmitting(false)
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => submitSos({ latitude: position.coords.latitude, longitude: position.coords.longitude }).then(onSuccess).catch(onFailure),
        () => submitSos().then(onSuccess).catch(onFailure),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    } else {
      submitSos().then(onSuccess).catch(onFailure)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center gap-3 bg-[var(--bg-main)] text-[var(--text-primary)]">
        <LoaderCircle className="animate-spin text-[var(--text-body)]" size={22} />
        <span>Loading vehicle details...</span>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center bg-[var(--bg-main)] px-6 py-20 text-center text-[var(--text-primary)]">
        <div className="glass-card rounded-2xl p-8 max-w-md border border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-primary)]">
          <AlertTriangle className="mx-auto text-[var(--text-body)]" size={36} />
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Vehicle Unavailable</h1>
          <p className="mt-2 text-sm text-[var(--text-body)]">{error || 'This QR decal is not linked to an active vehicle.'}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-[calc(100vh-81px)] bg-[var(--bg-main)] px-4 py-10 text-[var(--text-primary)] sm:px-6 selection:bg-[var(--bg-card)] selection:text-[var(--text-primary)]">
      <div className="mx-auto max-w-xl">
        <section className="glass-card animate-rise-in rounded-3xl p-6 sm:p-8 border border-[var(--border-divider)] bg-[var(--bg-card)] shadow-[0_24px_60px_rgba(0,0,0,0.35)] text-[var(--text-primary)]">
          <div className="rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-divider)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(136,136,136,0.3)]">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">QR Vehicle Alert Service</h1>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-body)]">
                  You are notifying the vehicle owner privately and securely. Select an issue below or type a custom message. No account required, and the owner will be notified instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-b border-[var(--border-divider)] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-body)]">Vehicle contact</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">{vehicle.plateNumber}</h1>
            <p className="mt-1 text-sm text-[var(--text-body)]">{vehicle.model || 'Vehicle model not provided'}</p>
          </div>

          {/* Emergency Assistance Callout */}
          <section className="mt-6 rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-4 shadow-[0_0_24px_rgba(136,136,136,0.15)]">
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 shrink-0 text-[var(--text-body)]" size={22} />
              <div className="min-w-0">
                <h2 className="font-bold text-[var(--text-primary)]">Emergency Assistance</h2>
                <p className="mt-0.5 text-xs leading-5 text-[var(--text-body)]">Use this only when immediate urgent action is required for this vehicle.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerSos}
              disabled={isSosSubmitting}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold tracking-wide text-[var(--text-primary)] shadow-[0_0_20px_rgba(0,0,0,0.4)] transition hover:bg-[var(--bg-card-inner)] disabled:cursor-wait disabled:opacity-60"
            >
              <Siren size={18} />
              {isSosSubmitting ? 'DISPATCHING...' : 'TRIGGER EMERGENCY SOS'}
            </button>
            {sosFeedback && (
              <p className={`mt-3 text-center text-xs font-semibold ${sosFeedback === 'Emergency dispatch triggered!' ? 'text-emerald-400' : 'text-rose-300'}`}>
                {sosFeedback}
              </p>
            )}
          </section>

          <div className="my-7 h-px bg-[var(--bg-card-secondary)]/25" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Report an Issue</h2>
          <p className="mt-1 text-xs text-[var(--text-body)]">Select everything that applies. The owner will be notified privately.</p>

          <form onSubmit={handleSubmit} className="mt-5 pb-2">
            <fieldset>
              <legend className="text-xs font-semibold text-[var(--text-body)]">What needs attention?</legend>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {ISSUE_TYPES.map((issue) => (
                  <label
                    key={issue}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-semibold transition hover:border-[var(--border-divider)] ${
                      selectedIssues.includes(issue)
                        ? 'border-[var(--border-divider)] bg-[var(--bg-card-inner)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(184,184,184,0.25)]'
                        : 'border-[var(--border-divider)] bg-[var(--bg-card)] text-[var(--text-body)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIssues.includes(issue)}
                      onChange={() => toggleIssue(issue)}
                      className="h-4 w-4 accent-[#3A2316]"
                    />
                    {issue}
                  </label>
                ))}
              </div>
            </fieldset>

            {selectedIssues.includes('Custom') && (
              <>
                <label className="mt-5 block text-xs font-semibold text-[var(--text-body)]" htmlFor="message">
                  Additional Message Details
                </label>
                <textarea
                  id="message"
                  required
                  rows="4"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Add helpful details for the owner..."
                  className="mt-1.5 mb-2 min-h-28 w-full resize-y rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)] focus:ring-1 focus:ring-[#F4EFEA]"
                />
              </>
            )}

            <label className="mt-5 block text-xs font-semibold text-[var(--text-body)]" htmlFor="image">
              Photo Evidence <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
              className="mt-1.5 block w-full cursor-pointer rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] text-xs text-[var(--text-body)] file:mr-4 file:border-0 file:bg-[var(--bg-card)] file:px-4 file:py-2.5 file:font-semibold file:text-[var(--text-primary)] hover:border-[var(--border-divider)]"
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Selected evidence preview"
                className="mt-3 h-20 w-20 rounded-xl object-cover ring-1 ring-[#3A2316]/40"
              />
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
                <Check size={16} /> Alert dispatched to the vehicle owner.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || selectedIssues.length === 0}
              className="btn-primary mt-6 w-full"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Dispatching Alert...' : 'Send Anonymous Alert'}</span>
            </button>
          </form>
        </section>
      </div>
      {showSosConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="sos-title" className="w-full max-w-sm rounded-2xl border border-[var(--border-divider)] bg-[var(--bg-card)] p-6 text-[var(--text-primary)] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Siren className="text-[var(--text-body)]" size={24} />
                <h2 id="sos-title" className="mt-3 text-xl font-bold">Trigger emergency SOS?</h2>
              </div>
              <button
                type="button"
                aria-label="Close confirmation"
                onClick={() => setShowSosConfirm(false)}
                className="rounded-lg p-1 text-[var(--text-body)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-body)]">
              The vehicle owner and emergency contact will be alerted immediately. Your location coordinates will be attached if granted.
            </p>
            <textarea
              value={sosNote}
              onChange={(event) => setSosNote(event.target.value)}
              rows="3"
              maxLength="500"
              placeholder="Optional details (e.g. smoke detected, blocked medical vehicle)"
              className="mt-4 w-full resize-none rounded-xl border border-[var(--border-divider)] bg-[var(--bg-card-inner)] p-3 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-divider)]"
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowSosConfirm(false)}
                className="btn-secondary !h-10 !px-3 !text-xs !rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSos}
                className="btn-primary !h-10 !px-3 !text-xs !rounded-xl"
              >
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default PublicScan
