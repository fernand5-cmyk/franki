import { useState, useEffect } from 'react'

const CATEGORIES = [
  { id: 'all',       label: 'All',       emoji: '⚡' },
  { id: 'sports',    label: 'Sports',    emoji: '🏆' },
  { id: 'events',    label: 'Events',    emoji: '🎉' },
  { id: 'academics', label: 'Academics', emoji: '📚' },
  { id: 'campus',    label: 'Campus',    emoji: '🏛️' },
  { id: 'weather',   label: 'Weather',   emoji: '🌤️' },
  { id: 'elections', label: 'Elections', emoji: '🗳️' },
]

function formatVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k LB`
  return `${v} LB`
}

function formatCloses(dt) {
  if (!dt) return null
  const d = new Date(dt)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return 'Closed'
  if (diff < 24 * 3600_000) {
    const h = Math.floor(diff / 3600_000)
    if (h < 1) return 'Closes in < 1h'
    return `Closes in ${h}h`
  }
  return `Closes ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function FriendsFeed({ token }) {
  const [feed, setFeed]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social/feed', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setFeed(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-text">Loading feed…</div>
  if (feed.length === 0) return (
    <div className="feed-empty">
      <div className="feed-empty-icon">👥</div>
      <div className="feed-empty-title">No activity yet</div>
      <div className="feed-empty-sub">Follow people on the leaderboard to see their bets here</div>
    </div>
  )

  return (
    <div className="feed-list">
      {feed.map((b, i) => (
        <div key={b._id || i} className="feed-card">
          <div className="feed-card-avatar">{b.bettor_initials || '?'}</div>
          <div className="feed-card-body">
            <div className="feed-card-who">
              <span className="feed-card-name">{b.bettor_name}</span>
              <span className="feed-card-action"> bet </span>
              <span className={`feed-card-side ${b.side}`}>{b.side?.toUpperCase()}</span>
            </div>
            <div className="feed-card-market">
              {b.market_icon} {b.market_question?.slice(0, 55)}{b.market_question?.length > 55 ? '…' : ''}
            </div>
            <div className="feed-card-meta">{b.amount} LB · {b.price_at_bet}¢</div>
          </div>
          <span className={`result-badge ${b.status}`}>
            {b.status === 'pending' ? 'Active' : b.status === 'won' ? 'Won' : b.status === 'lost' ? 'Lost' : 'Sold'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function HomeScreen({ user, onOpenMarket, onCreateBet, unreadCount = 0, onBellClick }) {
  const [view, setView]             = useState('markets')  // 'markets' | 'feed'
  const [activeTab, setActiveTab]   = useState('all')
  const [markets, setMarkets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (view !== 'markets') return
    setLoading(true)
    const controller = new AbortController()
    fetch(`/api/markets?category=${activeTab}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMarkets(data)
        setLoading(false)
      })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false) })
    return () => controller.abort()
  }, [activeTab, view])

  const filtered = search.trim()
    ? markets.filter(m => m.question.toLowerCase().includes(search.toLowerCase()))
    : markets

  return (
    <div className="home-screen">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-top">
          <div className="home-header-title">
            <h1>Franki</h1>
            <p className="home-motto">Because everything on campus is a competition anyway.</p>
          </div>
          <button className="notif-btn" onClick={onBellClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>

        <div className="search-bar" onClick={() => {}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search markets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* View toggle: Markets / Friends */}
      <div className="home-view-toggle">
        <button className={`view-toggle-btn ${view === 'markets' ? 'active' : ''}`} onClick={() => setView('markets')}>
          Markets
        </button>
        <button className={`view-toggle-btn ${view === 'feed' ? 'active' : ''}`} onClick={() => setView('feed')}>
          Friends
        </button>
      </div>

      {/* Friends Feed */}
      {view === 'feed' && (
        <div className="markets-content">
          <FriendsFeed token={token} />
        </div>
      )}

      {/* Category pills — only show for markets view */}
      {view === 'markets' && <div className="category-pills">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`cat-pill ${activeTab === cat.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(cat.id); setSearch('') }}
          >
            <span className="cat-pill-emoji">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>}

      {/* Markets list */}
      {view === 'markets' && <div className="markets-content">
        <div className="markets-header">
          <h2>Active Markets</h2>
          <button className="suggest-bet-btn" onClick={onCreateBet}>
            + Suggest
          </button>
        </div>

        {loading && (
          <div className="markets-loading">
            {[1,2,3].map(i => <div key={i} className="market-skeleton" />)}
          </div>
        )}

        {!loading && filtered.map(market => (
          <MarketCard
            key={market._id || market.id}
            market={market}
            onOpenMarket={onOpenMarket}
          />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="markets-empty">
            <span>No markets found</span>
          </div>
        )}
      </div>}
    </div>
  )
}

function MarketCard({ market, onOpenMarket }) {
  const closeStr = formatCloses(market.closes_at)
  const isUrgent = closeStr && closeStr.includes('in') && (closeStr.includes('h') || closeStr.includes('1h'))

  return (
    <div className="market-card" onClick={() => onOpenMarket(market)}>
      <div className="market-card-top">
        <div className="market-icon">{market.icon || market.emoji || '📊'}</div>
        <div className="market-info">
          <div className="market-category-label">{market.category}</div>
          <h3>{market.question}</h3>
          <span className="market-meta">{formatVolume(market.volume || 0)} volume</span>
        </div>
      </div>

      <div className="market-bets">
        <button
          className="bet-btn yes"
          onClick={e => { e.stopPropagation(); onOpenMarket(market, 'yes') }}
        >
          <span className="bet-price">{market.yes_price ?? market.yes}¢</span>
          <span className="bet-label">Yes</span>
        </button>
        <button
          className="bet-btn no"
          onClick={e => { e.stopPropagation(); onOpenMarket(market, 'no') }}
        >
          <span className="bet-price">{market.no_price ?? market.no}¢</span>
          <span className="bet-label">No</span>
        </button>
      </div>

      {closeStr && (
        <div className={`market-footer ${isUrgent ? 'urgent' : ''}`}>
          {isUrgent && '⏱ '}{closeStr}
        </div>
      )}
    </div>
  )
}
