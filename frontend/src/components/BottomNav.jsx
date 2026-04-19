export default function BottomNav({ activePage, setActivePage, onCreateBet }) {
  return (
    <div className="bottom-nav">
      <NavItem
        id="home"
        active={activePage === 'home'}
        label="Home"
        onClick={() => setActivePage('home')}
        icon={
          <svg viewBox="0 0 24 24" fill={activePage === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        }
      />

      <NavItem
        id="wallet"
        active={activePage === 'wallet'}
        label="Wallet"
        onClick={() => setActivePage('wallet')}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="3"/>
            <path d="M16 12h.01"/>
            <path d="M2 9h20"/>
          </svg>
        }
      />

      {/* Center add button */}
      <button className="nav-item-center" onClick={onCreateBet}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <NavItem
        id="results"
        active={activePage === 'results'}
        label="Results"
        onClick={() => setActivePage('results')}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        }
      />

      <NavItem
        id="profile"
        active={activePage === 'profile'}
        label="Profile"
        onClick={() => setActivePage('profile')}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        }
      />
    </div>
  )
}

function NavItem({ id, active, label, onClick, icon }) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span className="nav-label">{label}</span>
    </button>
  )
}
