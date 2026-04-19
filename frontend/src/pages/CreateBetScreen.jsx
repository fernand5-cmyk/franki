import { useState } from 'react'

const CATEGORIES = [
  { id: 'sports',    icon: '🏆', label: 'Sports' },
  { id: 'events',    icon: '🎉', label: 'Events' },
  { id: 'academics', icon: '📚', label: 'Academics' },
  { id: 'campus',    icon: '🏛️', label: 'Campus' },
  { id: 'weather',   icon: '🌤️', label: 'Weather' },
  { id: 'elections', icon: '🗳️', label: 'Elections' },
]

const QUESTION_TYPES = [
  {
    id: 'yes_no',
    label: 'Yes / No',
    desc: 'A simple yes or no outcome',
    example: '"Will Penn beat Princeton this weekend?"',
  },
  {
    id: 'over_under',
    label: 'Over / Under',
    desc: 'Will something exceed a threshold?',
    example: '"Will the CIS midterm average be above 80?"',
  },
  {
    id: 'date_based',
    label: 'Date Based',
    desc: 'Will something happen before a date?',
    example: '"Will Van Pelt reopeon before finals week?"',
  },
]

const ICON_SUGGESTIONS = {
  sports:    ['🏈', '🏀', '⚽', '🎾', '🏊', '🤼', '🏒', '🎽'],
  events:    ['🎉', '🎵', '🎤', '🎭', '🎪', '🌸', '☔', '🎓'],
  academics: ['📚', '📝', '🧪', '💻', '📊', '🧬', '📐', '🎓'],
  campus:    ['🏛️', '🍕', '🚨', '🛗', '🏠', '☕', '🚲', '🌿'],
  weather:   ['🌤️', '❄️', '☀️', '🌧️', '⛈️', '🌨️', '🌬️', '🌪️'],
  elections: ['🗳️', '🏛️', '📋', '🤝', '📣', '⚖️', '🗞️', '✊'],
}

export default function CreateBetScreen({ user, onBack, onSubmitted }) {
  const [step, setStep]       = useState(1)   // 1: type, 2: details, 3: confirm
  const [form, setForm]       = useState({
    question:      '',
    category:      'sports',
    icon:          '📊',
    question_type: 'yes_no',
    yes_price:     50,
    closes_at:     '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const token = localStorage.getItem('token')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.closes_at) {
      setError('Please fill in the question and closing date')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/markets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question:      form.question.trim(),
          category:      form.category,
          icon:          form.icon,
          question_type: form.question_type,
          yes_price:     form.yes_price,
          closes_at:     new Date(form.closes_at).toISOString(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Submission failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="create-bet-screen">
        <div className="create-success">
          <div className="create-success-icon">🎯</div>
          <h2 className="create-success-title">Bet Submitted!</h2>
          <p className="create-success-sub">
            Your market is under review. Once approved by the Franki team it'll go live for everyone to bet on.
          </p>
          <button className="btn-primary" onClick={onSubmitted}>Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="create-bet-screen">
      {/* Top bar */}
      <div className="create-topbar">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="create-topbar-title">Suggest a Bet</h1>
        <div />
      </div>

      <div className="create-content">
        {/* Step indicator */}
        <div className="create-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className={`create-step ${step === s ? 'active' : step > s ? 'done' : ''}`}>
              <div className="create-step-dot">{step > s ? '✓' : s}</div>
              <div className="create-step-label">
                {s === 1 ? 'Type' : s === 2 ? 'Details' : 'Review'}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Question type + category */}
        {step === 1 && (
          <div className="create-step-content">
            <h2 className="create-section-title">What kind of bet is it?</h2>
            <div className="create-type-list">
              {QUESTION_TYPES.map(qt => (
                <div
                  key={qt.id}
                  className={`create-type-card ${form.question_type === qt.id ? 'selected' : ''}`}
                  onClick={() => set('question_type', qt.id)}
                >
                  <div className="create-type-label">{qt.label}</div>
                  <div className="create-type-desc">{qt.desc}</div>
                  <div className="create-type-example">{qt.example}</div>
                </div>
              ))}
            </div>

            <h2 className="create-section-title" style={{ marginTop: 24 }}>Category</h2>
            <div className="create-category-grid">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`create-cat-btn ${form.category === c.id ? 'selected' : ''}`}
                  onClick={() => {
                    set('category', c.id)
                    set('icon', ICON_SUGGESTIONS[c.id][0])
                  }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <button className="btn-primary create-next-btn" onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="create-step-content">
            <h2 className="create-section-title">Write your question</h2>
            <textarea
              className="create-textarea"
              placeholder={
                form.question_type === 'yes_no'     ? 'Will Penn beat Princeton this weekend?' :
                form.question_type === 'over_under' ? 'Will the CIS midterm average be above 80?' :
                'Will the Van Pelt elevator be fixed before finals?'
              }
              value={form.question}
              onChange={e => set('question', e.target.value)}
              rows={3}
            />

            <h2 className="create-section-title">Icon</h2>
            <div className="create-icon-grid">
              {(ICON_SUGGESTIONS[form.category] || []).map(ic => (
                <button
                  key={ic}
                  className={`create-icon-btn ${form.icon === ic ? 'selected' : ''}`}
                  onClick={() => set('icon', ic)}
                >
                  {ic}
                </button>
              ))}
            </div>

            <h2 className="create-section-title">Initial YES likelihood</h2>
            <div className="create-slider-row">
              <span className="create-slider-label">Unlikely</span>
              <input
                type="range" min="5" max="95" step="5"
                value={form.yes_price}
                onChange={e => set('yes_price', parseInt(e.target.value))}
                className="create-slider"
              />
              <span className="create-slider-label">Likely</span>
            </div>
            <div className="create-slider-val">{form.yes_price}% chance YES</div>

            <h2 className="create-section-title">Closes on</h2>
            <input
              className="create-input"
              type="datetime-local"
              value={form.closes_at}
              onChange={e => set('closes_at', e.target.value)}
            />

            {error && <div className="bet-error">{error}</div>}

            <div className="create-nav-row">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!form.question.trim() || !form.closes_at) {
                    setError('Please fill in the question and closing date')
                  } else {
                    setError('')
                    setStep(3)
                  }
                }}
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review + submit */}
        {step === 3 && (
          <div className="create-step-content">
            <h2 className="create-section-title">Review your submission</h2>

            <div className="create-review-card">
              <div className="create-review-row">
                <span className="create-review-icon">{form.icon}</span>
                <div>
                  <div className="create-review-category">{form.category} · {form.question_type.replace('_', '/')}</div>
                  <div className="create-review-question">{form.question}</div>
                </div>
              </div>
              <div className="create-review-meta">
                <span>YES {form.yes_price}¢ · NO {100 - form.yes_price}¢</span>
                <span>Closes {form.closes_at ? new Date(form.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
              </div>
            </div>

            <div className="create-review-note">
              Your bet will be reviewed by the Franki team before going live. This usually takes less than 24 hours.
            </div>

            {error && <div className="bet-error">{error}</div>}

            <div className="create-nav-row">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Edit</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Bet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
