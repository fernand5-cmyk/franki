const ICONS = {
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <path d="M16 12h.01"/>
      <path d="M2 9h20"/>
    </svg>
  ),
  results: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
}

export default function BlankScreen({ label, icon, onLogout }) {
  return (
    <div className="blank-screen">
      {ICONS[icon]}
      <p>{label}</p>
      <p style={{ fontSize: 12, color: '#ccc' }}>Coming soon</p>
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            marginTop: 16,
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 13,
            color: '#888',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Sign out
        </button>
      )}
    </div>
  )
}
