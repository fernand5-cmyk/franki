import { useState, useEffect, useRef } from 'react'

function PriceChart({ history, yesPrice }) {
  const svgRef = useRef(null)

  if (!history || history.length < 2) {
    // Flat line at current price
    const pct = yesPrice
    return (
      <div className="price-chart">
        <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
          <line x1="0" y1={80 - pct * 0.7} x2="300" y2={80 - pct * 0.7}
                stroke="#00c950" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
        </svg>
        <div className="chart-no-data">Not enough data yet</div>
      </div>
    )
  }

  const points = history.map(h => h.y)
  const min = Math.max(0,  Math.min(...points) - 5)
  const max = Math.min(100, Math.max(...points) + 5)
  const range = max - min || 1
  const w = 300, h = 80
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const ys = points.map(p => h - ((p - min) / range) * h)
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const areaD = pathD + ` L${w},${h} L0,${h} Z`

  const latest = points[points.length - 1]
  const first  = points[0]
  const trend  = latest >= first ? '#00c950' : '#e7000b'

  return (
    <div className="price-chart">
      <svg ref={svgRef} width="100%" height="80" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trend} stopOpacity="0.25" />
            <stop offset="100%" stopColor={trend} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke={trend} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="chart-labels">
        <span>{first}¢</span>
        <span className={latest >= first ? 'up' : 'down'}>
          {latest >= first ? '▲' : '▼'} {Math.abs(latest - first)}¢
        </span>
        <span>{latest}¢</span>
      </div>
    </div>
  )
}

export default function MarketDetailScreen({ market: initialMarket, user, onBack, onUserUpdate }) {
  const [market, setMarket]     = useState(initialMarket)
  const [side, setSide]         = useState(initialMarket.prefillSide || 'yes')
  const [amount, setAmount]     = useState('100')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const [balance, setBalance]   = useState(user.balance || 1000)

  // Fetch fresh market data (with price_history)
  useEffect(() => {
    const id = initialMarket._id || initialMarket.id
    if (!id) return
    fetch(`/api/markets/${id}`)
      .then(r => r.json())
      .then(data => { if (data._id) setMarket(data) })
      .catch(() => {})

    // Also watch market (increment watcher count)
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`/api/markets/${id}/watch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {})
    }
  }, [initialMarket._id || initialMarket.id])

  const price       = side === 'yes' ? (market.yes_price || market.yes || 50) : (market.no_price || market.no || 50)
  const amountNum   = parseInt(amount) || 0
  const payout      = amountNum > 0 ? Math.floor(amountNum * 100 / price) : 0
  const profit      = payout - amountNum

  const handleBet = async () => {
    if (amountNum < 10) { setError('Minimum bet is 10 LB'); return }
    if (amountNum > balance) { setError('Insufficient balance'); return }
    setError('')
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res  = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          market_id: market._id || market.id,
          side,
          amount: amountNum
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        const newBal = balance - amountNum
        setBalance(newBal)
        onUserUpdate({ ...user, balance: newBal })
        // Refresh market prices
        const mres = await fetch(`/api/markets/${market._id || market.id}`)
        const mdata = await mres.json()
        if (mdata._id) setMarket(mdata)
      } else {
        setError(data.error || 'Could not place bet')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const history    = market.price_history || []
  const closeStr   = market.closes_at
    ? new Date(market.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="market-detail-screen">
      {/* Top bar */}
      <div className="detail-topbar">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className="detail-category">{market.icon} {market.category}</span>
        <div className="detail-balance">{balance.toLocaleString()} LB</div>
      </div>

      {/* Question */}
      <div className="detail-question-section">
        <h2 className="detail-question">{market.question}</h2>
        <div className="detail-meta-row">
          <span className="detail-volume">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            {(market.volume || 0).toLocaleString()} LB vol
          </span>
          {closeStr && <span className="detail-closes">Closes {closeStr}</span>}
        </div>
      </div>

      {/* Price chart */}
      <div className="detail-chart-section">
        <div className="chart-header">
          <span>Yes price history</span>
          <span className="chart-current">{market.yes_price || market.yes || 50}¢</span>
        </div>
        <PriceChart history={history} yesPrice={market.yes_price || market.yes || 50} />
      </div>

      {/* Current odds */}
      <div className="detail-odds-row">
        <div className="odds-box yes">
          <div className="odds-pct">{market.yes_price || market.yes || 50}%</div>
          <div className="odds-label">YES likely</div>
        </div>
        <div className="odds-divider" />
        <div className="odds-box no">
          <div className="odds-pct">{market.no_price || market.no || 50}%</div>
          <div className="odds-label">NO likely</div>
        </div>
      </div>

      {/* Bet section */}
      {success ? (
        <div className="bet-success">
          <div className="bet-success-icon">✓</div>
          <div className="bet-success-title">Bet placed!</div>
          <div className="bet-success-sub">
            {amountNum} LB on {side.toUpperCase()} · potential payout {payout} LB
          </div>
          <button className="btn-primary" onClick={() => setSuccess(false)}>Bet again</button>
          <button className="btn-secondary" onClick={onBack}>Back to markets</button>
        </div>
      ) : (
        <div className="bet-section">
          <div className="side-toggle">
            <button className={`side-btn yes ${side === 'yes' ? 'active' : ''}`} onClick={() => setSide('yes')}>
              Buy YES · {market.yes_price || market.yes || 50}¢
            </button>
            <button className={`side-btn no ${side === 'no' ? 'active' : ''}`} onClick={() => setSide('no')}>
              Buy NO · {market.no_price || market.no || 50}¢
            </button>
          </div>

          <div className="bet-amount-section">
            <label className="bet-amount-label">Amount (LB)</label>
            <div className="bet-amount-input-row">
              <button className="amt-preset" onClick={() => setAmount('50')}>50</button>
              <button className="amt-preset" onClick={() => setAmount('100')}>100</button>
              <button className="amt-preset" onClick={() => setAmount('250')}>250</button>
              <input
                className="bet-amount-input"
                type="number"
                min="10"
                max={balance}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="bet-summary">
            <div className="bet-summary-row">
              <span>Cost</span>
              <span>{amountNum} LB</span>
            </div>
            <div className="bet-summary-row">
              <span>Potential payout</span>
              <span className="green">{payout > 0 ? `${payout} LB` : '—'}</span>
            </div>
            <div className="bet-summary-row">
              <span>Potential profit</span>
              <span className={profit >= 0 ? 'green' : 'red'}>
                {payout > 0 ? `+${profit} LB` : '—'}
              </span>
            </div>
            <div className="bet-summary-row muted">
              <span>Return if {side.toUpperCase()} wins</span>
              <span>{price > 0 ? `${((100 / price)).toFixed(2)}x` : '—'}</span>
            </div>
          </div>

          {error && <div className="bet-error">{error}</div>}

          <button
            className="btn-primary bet-confirm"
            onClick={handleBet}
            disabled={loading || amountNum < 10}
          >
            {loading ? 'Placing…' : `Buy ${side.toUpperCase()} for ${amountNum} LB`}
          </button>
          <p className="bet-balance-hint">Balance: {balance.toLocaleString()} LB</p>
        </div>
      )}
    </div>
  )
}
