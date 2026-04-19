import { useState, useEffect } from 'react'

const TX_COLORS = {
  bet_won:      { bg: '#dcfce7', icon: '📈', color: '#00a63e' },
  bet_lost:     { bg: '#ffe2e2', icon: '📉', color: '#e7000b' },
  bet_placed:   { bg: '#dbeafe', icon: '🎯', color: '#2563eb' },
  signup_bonus: { bg: '#f3e8ff', icon: '🎁', color: '#9333ea' },
  daily_bonus:  { bg: '#f3e8ff', icon: '⭐', color: '#9333ea' },
  achievement:  { bg: '#fef3c7', icon: '🏆', color: '#d97706' },
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000)    return 'Just now'
  if (diff < 3600_000)  return `${Math.floor(diff/60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff/3600_000)}h ago`
  if (diff < 604800_000) return `${Math.floor(diff/86400_000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WalletScreen({ user }) {
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance]           = useState(user.balance || 1000)
  const [pendingBets, setPendingBets]   = useState([])
  const [stats, setStats]               = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/users/me',           { headers }).then(r => r.json()),
      fetch('/api/transactions/mine',  { headers }).then(r => r.json()),
      fetch('/api/users/me/stats',     { headers }).then(r => r.json()),
      fetch('/api/bets/mine',          { headers }).then(r => r.json()),
    ]).then(([me, txs, st, bets]) => {
      if (me.balance !== undefined) setBalance(me.balance)
      if (Array.isArray(txs)) setTransactions(txs)
      if (st.total_bets !== undefined) setStats(st)
      if (Array.isArray(bets)) setPendingBets(bets.filter(b => b.status === 'pending'))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Portfolio = cash balance + current value of all pending bets
  const pendingValue = pendingBets.reduce((sum, b) => sum + (b.current_value ?? b.amount), 0)
  const portfolioTotal = balance + pendingValue

  const wonCount  = stats?.won_bets      ?? 0
  const totalBets = stats?.total_bets    ?? 0
  const profit    = stats?.total_profit  ?? 0

  return (
    <div className="wallet-screen">
      {/* Header */}
      <div className="page-header-light">
        <h1>Wallet</h1>
        <p>Manage your Liberty Bucks</p>
      </div>

      {/* Balance card */}
      <div className="wallet-balance-card">
        <div className="wallet-balance-top">
          <div>
            <div className="wallet-balance-label">Portfolio Value</div>
            <div className="wallet-balance-amount">{portfolioTotal.toLocaleString()} LB</div>
          </div>
          <div className="wallet-balance-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
        </div>
        {pendingValue > 0 && (
          <div className="wallet-balance-breakdown">
            <span>{balance.toLocaleString()} LB cash</span>
            <span>+</span>
            <span>{pendingValue.toLocaleString()} LB in bets</span>
          </div>
        )}
        <div className="wallet-balance-trend">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <span className={profit >= 0 ? 'positive' : 'negative'}>
            {profit >= 0 ? '+' : ''}{profit.toLocaleString()} LB all time
          </span>
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="wallet-stats-row">
          <div className="wallet-stat-card">
            <div className="wallet-stat-icon" style={{ background: '#dcfce7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00a63e" strokeWidth="2" width="20" height="20">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div className="wallet-stat-value">{wonCount}</div>
            <div className="wallet-stat-label">Markets Won</div>
          </div>
          <div className="wallet-stat-card">
            <div className="wallet-stat-icon" style={{ background: '#dbeafe' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="wallet-stat-value">{totalBets}</div>
            <div className="wallet-stat-label">Total Bets</div>
          </div>
          <div className="wallet-stat-card">
            <div className="wallet-stat-icon" style={{ background: '#f3e8ff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" width="20" height="20">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
                <path d="M4 22h16"/>
                <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
              </svg>
            </div>
            <div className="wallet-stat-value">{stats?.best_streak ?? 0}</div>
            <div className="wallet-stat-label">Best Streak</div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="transactions-section">
        <h2 className="section-title">Recent Transactions</h2>
        {loading && <div className="loading-text">Loading…</div>}
        {!loading && transactions.length === 0 && (
          <div className="empty-state">No transactions yet. Place your first bet!</div>
        )}
        {transactions.map((tx, i) => {
          const style = TX_COLORS[tx.type] || { bg: '#f3f4f6', icon: '💰', color: '#374151' }
          const isPositive = tx.amount > 0
          return (
            <div key={tx._id || i} className="tx-row">
              <div className="tx-icon" style={{ background: style.bg }}>
                {style.icon}
              </div>
              <div className="tx-info">
                <div className="tx-title">{tx.description}</div>
                <div className="tx-date">{formatDate(tx.created_at)}</div>
              </div>
              <div className={`tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{tx.amount.toLocaleString()} LB
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
