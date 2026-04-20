import { useState, useEffect } from 'react'

const CATEGORIES = ['sports', 'events', 'academics', 'campus', 'weather', 'elections']
const CATEGORY_ICONS = {
  sports: '🏆', events: '🎉', academics: '📚', campus: '🏛️', weather: '🌤️', elections: '🗳️'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PendingCard({ market, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason]       = useState('')

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <span className="admin-card-icon">{market.icon || '📊'}</span>
        <div className="admin-card-meta">
          <span className="admin-card-category">{market.category}</span>
          <span className="admin-card-type">{market.question_type?.replace('_', '/') || 'yes/no'}</span>
        </div>
        <span className="admin-card-date">Closes {formatDate(market.closes_at)}</span>
      </div>
      <div className="admin-card-question">{market.question}</div>
      <div className="admin-card-odds">
        <span>YES {market.yes_price}¢</span>
        <span>NO {market.no_price}¢</span>
        <span className="admin-card-submitter">by {market.created_by?.split('|')[1] || market.created_by}</span>
      </div>

      {rejecting ? (
        <div className="admin-reject-form">
          <input
            className="admin-reject-input"
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="admin-reject-actions">
            <button className="admin-btn-reject" onClick={() => onReject(market._id, reason)}>
              Confirm Reject
            </button>
            <button className="admin-btn-cancel" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="admin-card-actions">
          <button className="admin-btn-approve" onClick={() => onApprove(market._id)}>
            ✓ Approve
          </button>
          <button className="admin-btn-reject" onClick={() => setRejecting(true)}>
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  )
}

function CreateMarketForm({ onCreated }) {
  const [form, setForm] = useState({
    question: '', category: 'sports', icon: '📊',
    yes_price: '50', closes_at: '', question_type: 'yes_no',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const token = localStorage.getItem('token')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.closes_at) {
      setError('Question and closing date are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question:      form.question.trim(),
          category:      form.category,
          icon:          form.icon,
          yes_price:     parseInt(form.yes_price),
          closes_at:     new Date(form.closes_at).toISOString(),
          question_type: form.question_type,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setForm({ question: '', category: 'sports', icon: '📊', yes_price: '50', closes_at: '', question_type: 'yes_no' })
        setTimeout(() => setSuccess(false), 3000)
        onCreated()
      } else {
        setError(data.error || 'Failed to create market')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-create-form">
      <div className="admin-form-group">
        <label className="admin-form-label">Question</label>
        <textarea
          className="admin-form-textarea"
          placeholder="Will Penn beat Princeton this weekend?"
          value={form.question}
          onChange={e => set('question', e.target.value)}
          rows={3}
        />
      </div>

      <div className="admin-form-row">
        <div className="admin-form-group half">
          <label className="admin-form-label">Category</label>
          <select className="admin-form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="admin-form-group half">
          <label className="admin-form-label">Question Type</label>
          <select className="admin-form-select" value={form.question_type} onChange={e => set('question_type', e.target.value)}>
            <option value="yes_no">Yes / No</option>
            <option value="over_under">Over / Under</option>
            <option value="date_based">Date Based</option>
          </select>
        </div>
      </div>

      <div className="admin-form-row">
        <div className="admin-form-group half">
          <label className="admin-form-label">Icon (emoji)</label>
          <input
            className="admin-form-input"
            value={form.icon}
            onChange={e => set('icon', e.target.value)}
            placeholder="📊"
          />
        </div>
        <div className="admin-form-group half">
          <label className="admin-form-label">Initial YES price (¢)</label>
          <input
            className="admin-form-input"
            type="number"
            min="5" max="95"
            value={form.yes_price}
            onChange={e => set('yes_price', e.target.value)}
          />
        </div>
      </div>

      <div className="admin-form-group">
        <label className="admin-form-label">Closing date & time</label>
        <input
          className="admin-form-input"
          type="datetime-local"
          value={form.closes_at}
          onChange={e => set('closes_at', e.target.value)}
        />
      </div>

      {error && <div className="admin-form-error">{error}</div>}
      {success && <div className="admin-form-success">✓ Market created and live!</div>}

      <button className="admin-btn-create" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Creating…' : 'Create Market'}
      </button>
    </div>
  )
}

function AnalyticsDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-text">Loading analytics…</div>
  if (!data)   return <div className="empty-state">Failed to load analytics</div>

  const maxVol = Math.max(...(data.category_stats.map(c => c.volume) || [1]), 1)
  const maxDay = Math.max(...(data.daily_counts.map(d => d.count)    || [1]), 1)

  return (
    <div className="analytics-grid">
      {/* KPI row */}
      <div className="analytics-kpis">
        {[
          { label: 'Total Users',    val: data.total_users },
          { label: 'Open Markets',   val: data.open_markets },
          { label: 'Total Bets',     val: data.total_bets },
          { label: 'LB Circulating', val: `${(data.total_lb/1000).toFixed(1)}k` },
        ].map(k => (
          <div key={k.label} className="analytics-kpi">
            <div className="analytics-kpi-val">{k.val}</div>
            <div className="analytics-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Pending review alert */}
      {data.pending_review > 0 && (
        <div className="analytics-alert">
          ⚠️ {data.pending_review} market{data.pending_review > 1 ? 's' : ''} pending review
        </div>
      )}

      {/* Bets per day sparkbar */}
      <div className="analytics-card">
        <div className="analytics-card-title">Bets per day (last 7 days)</div>
        <div className="analytics-bars">
          {data.daily_counts.map(d => (
            <div key={d.date} className="analytics-bar-col">
              <div
                className="analytics-bar"
                style={{ height: `${Math.max(4, (d.count / maxDay) * 80)}px` }}
              />
              <div className="analytics-bar-label">{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume by category */}
      <div className="analytics-card">
        <div className="analytics-card-title">Volume by category</div>
        {data.category_stats.map(c => (
          <div key={c._id} className="analytics-cat-row">
            <div className="analytics-cat-name">{c._id}</div>
            <div className="analytics-cat-bar-wrap">
              <div
                className="analytics-cat-bar"
                style={{ width: `${(c.volume / maxVol) * 100}%` }}
              />
            </div>
            <div className="analytics-cat-vol">{(c.volume/1000).toFixed(1)}k</div>
          </div>
        ))}
      </div>

      {/* Top bettors */}
      <div className="analytics-card">
        <div className="analytics-card-title">Most active users</div>
        {data.top_bettors.map((b, i) => (
          <div key={b._id} className="analytics-user-row">
            <div className="analytics-rank">#{i + 1}</div>
            <div className="analytics-avatar">{b.avatar_initials}</div>
            <div className="analytics-user-name">{b.display_name}</div>
            <div className="analytics-user-stat">{b.bet_count} bets</div>
            <div className="analytics-user-stat muted">{b.total_wagered?.toLocaleString()} LB</div>
          </div>
        ))}
      </div>

      {/* Top markets */}
      <div className="analytics-card">
        <div className="analytics-card-title">Top markets by volume</div>
        {data.top_markets.map((m, i) => (
          <div key={m._id} className="analytics-market-row">
            <span className="analytics-market-icon">{m.icon}</span>
            <div className="analytics-market-q">{m.question?.slice(0, 45)}…</div>
            <div className="analytics-market-vol">{(m.volume/1000).toFixed(1)}k</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminScreen({ user, onLogout }) {
  const [tab, setTab]           = useState('review')   // 'review' | 'create' | 'resolve' | 'analytics'
  const [pending, setPending]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [liveMarkets, setLiveMarkets] = useState([])
  const [actionMsg, setActionMsg] = useState('')

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const loadPending = () => {
    setLoading(true)
    fetch('/api/admin/markets/pending', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPending(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const loadLive = () => {
    fetch('/api/markets', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLiveMarkets(data) })
      .catch(() => {})
  }

  useEffect(() => {
    loadPending()
    loadLive()
  }, [])

  const handleApprove = async (marketId) => {
    await fetch(`/api/admin/markets/${marketId}/approve`, { method: 'POST', headers })
    setActionMsg('Market approved and live!')
    loadPending()
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleReject = async (marketId, reason) => {
    await fetch(`/api/admin/markets/${marketId}/reject`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setActionMsg('Market rejected.')
    loadPending()
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleResolve = async (marketId, outcome) => {
    await fetch(`/api/admin/markets/${marketId}/resolve`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    })
    setActionMsg(`Market resolved as ${outcome.toUpperCase()}!`)
    loadLive()
    setTimeout(() => setActionMsg(''), 3000)
  }

  return (
    <div className="admin-screen">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-header-badge">ADMIN</div>
          <h1 className="admin-header-title">Franki Admin</h1>
        </div>
        <button className="admin-logout-btn" onClick={onLogout}>Sign Out</button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>
          Review
          {pending.length > 0 && <span className="admin-tab-badge">{pending.length}</span>}
        </button>
        <button className={`admin-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          Create
        </button>
        <button className={`admin-tab ${tab === 'resolve' ? 'active' : ''}`} onClick={() => { loadLive(); setTab('resolve') }}>
          Resolve
        </button>
        <button className={`admin-tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>
          Analytics
        </button>
      </div>

      {actionMsg && <div className="admin-action-msg">{actionMsg}</div>}

      <div className="admin-content">

        {/* Review queue */}
        {tab === 'review' && (
          <>
            {loading && <div className="loading-text">Loading…</div>}
            {!loading && pending.length === 0 && (
              <div className="empty-state">No markets pending review</div>
            )}
            {pending.map(m => (
              <PendingCard
                key={m._id}
                market={m}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </>
        )}

        {/* Create market */}
        {tab === 'create' && (
          <CreateMarketForm onCreated={loadLive} />
        )}

        {/* Analytics */}
        {tab === 'analytics' && <AnalyticsDashboard />}

        {/* Resolve markets */}
        {tab === 'resolve' && (
          <>
            {liveMarkets.length === 0 && <div className="empty-state">No open markets</div>}
            {liveMarkets.map(m => (
              <div key={m._id} className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-icon">{m.icon || '📊'}</span>
                  <span className="admin-card-category">{m.category}</span>
                  <span className="admin-card-date">Closes {formatDate(m.closes_at)}</span>
                </div>
                <div className="admin-card-question">{m.question}</div>
                <div className="admin-card-odds">
                  <span>YES {m.yes_price}¢</span>
                  <span>NO {m.no_price}¢</span>
                  <span>{(m.volume || 0).toLocaleString()} LB vol</span>
                </div>
                <div className="admin-card-actions">
                  <button className="admin-btn-approve" onClick={() => handleResolve(m._id, 'yes')}>
                    Resolve YES
                  </button>
                  <button className="admin-btn-reject" onClick={() => handleResolve(m._id, 'no')}>
                    Resolve NO
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
