import { useState, useEffect } from 'react'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatsBanner({ stats }) {
  const profit = stats.total_profit || 0
  return (
    <div className="results-banner">
      <div className="results-banner-top">
        <div className="results-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="24" height="24">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
            <path d="M4 22h16"/>
            <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
          </svg>
        </div>
        <div>
          <div className={`results-total-profit ${profit >= 0 ? 'positive' : 'negative'}`}>
            {profit >= 0 ? '+' : ''}{profit.toLocaleString()} LB
          </div>
          <div className="results-total-label">Total Earnings</div>
        </div>
      </div>
      <div className="results-stats-row">
        <div className="results-stat">
          <div className="results-stat-val">{stats.win_rate ?? 0}%</div>
          <div className="results-stat-lbl">Win Rate</div>
        </div>
        <div className="results-stat">
          <div className="results-stat-val">{stats.total_wagered ?? 0}</div>
          <div className="results-stat-lbl">Total Bet</div>
        </div>
        <div className="results-stat">
          <div className="results-stat-val">{(stats.total_wagered ?? 0) + Math.max(0, profit)}</div>
          <div className="results-stat-lbl">Total Won</div>
        </div>
      </div>
    </div>
  )
}

function BetCard({ bet, onSell }) {
  const won     = bet.status === 'won'
  const lost    = bet.status === 'lost'
  const sold    = bet.status === 'sold'
  const pending = bet.status === 'pending'

  const profit = won  ? (bet.payout || 0) - bet.amount
               : lost ? -bet.amount
               : sold ? (bet.payout || 0) - bet.amount
               : null

  const currentValue = bet.current_value ?? null
  const valueChange  = currentValue !== null ? currentValue - bet.amount : null
  const [selling, setSelling] = useState(false)

  const handleSell = async () => {
    setSelling(true)
    await onSell(bet._id)
    setSelling(false)
  }

  const badgeClass = won ? 'won' : lost ? 'lost' : sold ? 'sold' : 'pending'
  const badgeLabel = won ? 'Won' : lost ? 'Lost' : sold ? 'Sold' : 'Active'

  return (
    <div className="result-card">
      <div className="result-card-top">
        <span className="result-icon">{bet.market_icon || '📊'}</span>
        <div className="result-info">
          <div className="result-question">{bet.market_question || 'Unknown market'}</div>
          <div className="result-meta">
            {bet.market_category} · {pending ? 'Active' : formatDate(bet.placed_at)}
          </div>
        </div>
        <span className={`result-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>

      {/* Resolved: won / lost / sold */}
      {!pending && (
        <div className="result-detail-row">
          <div className="result-detail-item">
            <div className="result-detail-label">Bet</div>
            <div className="result-detail-value">{bet.amount} LB</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={won ? '#00a63e' : '#9ca3af'} strokeWidth="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <div className="result-detail-item">
            <div className="result-detail-label">Payout</div>
            <div className={`result-detail-value ${(won || sold) ? 'green' : ''}`}>
              {(won || sold) ? `${bet.payout} LB` : '0 LB'}
            </div>
          </div>
          {profit !== null && (
            <>
              <div className="result-divider" />
              <div className={`result-profit-chip ${profit >= 0 ? 'positive' : 'negative'}`}>
                {profit >= 0 ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                    +{profit}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
                      <polyline points="16 17 22 17 22 11"/>
                    </svg>
                    {profit}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Pending: current value + sell button */}
      {pending && (
        <>
          <div className="result-pending-row">
            <div className="result-detail-item">
              <div className="result-detail-label">Your bet</div>
              <div className="result-detail-value">{bet.side?.toUpperCase()} · {bet.amount} LB</div>
            </div>
            <div className="result-detail-item">
              <div className="result-detail-label">Bought at</div>
              <div className="result-detail-value">{bet.price_at_bet}¢</div>
            </div>
            <div className="result-detail-item">
              <div className="result-detail-label">Now worth</div>
              <div className={`result-detail-value ${valueChange !== null && valueChange >= 0 ? 'green' : valueChange !== null ? 'red' : ''}`}>
                {currentValue !== null ? `${currentValue} LB` : '—'}
                {valueChange !== null && (
                  <span className="result-value-delta">
                    {' '}({valueChange >= 0 ? '+' : ''}{valueChange})
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="result-sell-btn"
            onClick={handleSell}
            disabled={selling}
          >
            {selling ? 'Selling…' : `Sell for ${currentValue ?? '—'} LB`}
          </button>
        </>
      )}
    </div>
  )
}

export default function ResultsScreen({ user, onUserUpdate }) {
  const [bets, setBets]       = useState([])
  const [stats, setStats]     = useState({})
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const load = () => {
    Promise.all([
      fetch('/api/bets/mine',      { headers }).then(r => r.json()),
      fetch('/api/users/me/stats', { headers }).then(r => r.json()),
    ]).then(([b, s]) => {
      if (Array.isArray(b)) setBets(b)
      if (s.total_bets !== undefined) setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSell = async (betId) => {
    const res = await fetch(`/api/bets/${betId}/sell`, { method: 'POST', headers })
    if (res.ok) {
      load()
      const meRes = await fetch('/api/users/me', { headers })
      const me = await meRes.json()
      if (me.balance !== undefined && onUserUpdate) onUserUpdate(me)
    }
  }

  const filtered = filter === 'all'    ? bets
    : filter === 'active'              ? bets.filter(b => b.status === 'pending')
    : filter === 'won'                 ? bets.filter(b => b.status === 'won')
    : filter === 'lost'                ? bets.filter(b => b.status === 'lost')
    : bets

  const hasBets = bets.length > 0

  return (
    <div className="results-screen">
      <div className="page-header-light">
        <h1>Results</h1>
        <p>Your markets & outcomes</p>
      </div>

      {!loading && hasBets && <StatsBanner stats={stats} />}

      {!loading && stats.best_streak > 2 && (
        <div className="achievement-banner">
          <div className="achievement-banner-icon">🏆</div>
          <div>
            <div className="achievement-banner-title">On a streak!</div>
            <div className="achievement-banner-sub">
              {stats.best_streak} consecutive wins · keep it up
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      )}

      {hasBets && (
        <div className="results-filter-tabs">
          {[
            { id: 'all',    label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'won',    label: 'Won' },
            { id: 'lost',   label: 'Lost' },
          ].map(f => (
            <button
              key={f.id}
              className={`filter-tab ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="results-list">
        <h2 className="section-title">
          {filter === 'all'    ? 'Recent Results' :
           filter === 'active' ? 'Active Bets' :
           filter === 'won'    ? 'Wins' : 'Losses'}
        </h2>

        {loading && <div className="loading-text">Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            {bets.length === 0
              ? 'No bets yet — head to Explore to get started!'
              : `No ${filter} bets.`}
          </div>
        )}

        {filtered.map((bet, i) => (
          <BetCard key={bet._id || i} bet={bet} onSell={handleSell} />
        ))}
      </div>
    </div>
  )
}
