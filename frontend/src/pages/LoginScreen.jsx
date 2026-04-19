import { useState } from 'react'

const PENN_SCHOOLS = [
  "School of Engineering and Applied Science",
  "School of Arts & Sciences",
  "The Wharton School",
  "Annenberg School for Communication",
  "Stuart Weitzman School of Design",
  "School of Dental Medicine",
  "Graduate",
  "Penn Carey Law",
  "Perelman School of Medicine",
  "School of Nursing",
  "School of Social Policy and Practice",
  "School of Veterinary Medicine",
]

const SCHOOL_SHORT = {
  "School of Engineering and Applied Science": "SEAS",
  "School of Arts & Sciences": "SAS",
  "The Wharton School": "Wharton",
  "Annenberg School for Communication": "Annenberg",
  "Stuart Weitzman School of Design": "Design",
  "School of Dental Medicine": "Dental",
  "Graduate": "Graduate",
  "Penn Carey Law": "Law",
  "Perelman School of Medicine": "Medicine",
  "School of Nursing": "Nursing",
  "School of Social Policy and Practice": "Social Policy",
  "School of Veterinary Medicine": "Vet Med",
}

export default function LoginScreen({ onLogin }) {
  const [mode, setMode]               = useState('login')   // 'login' | 'register' | 'forgot' | 'reset'
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [school, setSchool]           = useState('')
  const [gradYear, setGradYear]       = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  // Forgot / reset password state
  const [forgotEmail, setForgotEmail]       = useState('')
  const [resetToken, setResetToken]         = useState('')
  const [resetTokenInput, setResetTokenInput] = useState('')
  const [resetPassword, setResetPassword]   = useState('')
  const [resetConfirm, setResetConfirm]     = useState('')
  const [forgotSuccess, setForgotSuccess]   = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, i) => currentYear + i)

  const switchMode = (m) => { setMode(m); setError(''); setForgotSuccess(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const res  = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (data.success) {
          onLogin(data.user, data.token)
        } else {
          setError(data.error || 'Invalid email or password')
        }

      } else if (mode === 'register') {
        if (!displayName.trim()) { setError('Name is required'); setLoading(false); return }
        const res  = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, password,
            display_name:    displayName,
            school:          school || null,
            graduation_year: gradYear ? parseInt(gradYear) : null,
          })
        })
        const data = await res.json()
        if (data.success) {
          onLogin(data.user, data.token)
        } else {
          setError(data.error || 'Registration failed')
        }

      } else if (mode === 'forgot') {
        const res  = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail })
        })
        const data = await res.json()
        if (data.success) {
          setForgotSuccess(true)
          if (data.token) {
            setResetToken(data.token)
            setResetTokenInput(data.token)
          }
        } else {
          setError(data.error || 'Request failed')
        }

      } else if (mode === 'reset') {
        if (resetPassword !== resetConfirm) { setError('Passwords do not match'); setLoading(false); return }
        if (resetPassword.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
        const res  = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetTokenInput, password: resetPassword })
        })
        const data = await res.json()
        if (data.success) {
          switchMode('login')
          setError('')
        } else {
          setError(data.error || 'Reset failed — check your token')
        }
      }
    } catch {
      setError('Cannot connect to server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        Penn Prediction Markets
      </div>

      <h1 className="login-title">Franki</h1>
      <p className="login-subtitle">Predict campus outcomes.<br/>Win Liberty Bucks.</p>

      {/* Features — only show on login/register */}
      {(mode === 'login' || mode === 'register') && (
        <div className="login-features">
          <div className="login-feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>Campus Markets</h4>
              <p>Bet on sports, elections, events, and more</p>
            </div>
          </div>
          <div className="login-feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>Liberty Bucks</h4>
              <p>Use virtual currency to place bets safely</p>
            </div>
          </div>
          <div className="login-feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 2H6v7a6 6 0 0012 0V2z"/><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>Win &amp; Compete</h4>
              <p>Earn rewards and climb the leaderboard</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Forgot password ── */}
      {mode === 'forgot' && (
        <>
          <div className="login-back-row">
            <button className="login-back-link" type="button" onClick={() => switchMode('login')}>
              ← Back to sign in
            </button>
          </div>
          <h2 className="login-section-title">Reset Password</h2>
          <p className="login-section-sub">Enter your Penn email and we'll generate a reset token.</p>

          {forgotSuccess ? (
            <div className="forgot-success-box">
              <div className="forgot-success-icon">✓</div>
              <p className="forgot-success-msg">Reset token generated!</p>
              <p className="forgot-success-sub">Copy the token below, then use it to set a new password.</p>
              {resetToken && (
                <div className="reset-token-display">
                  <span className="reset-token-label">Your token:</span>
                  <code className="reset-token-value">{resetToken}</code>
                </div>
              )}
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => switchMode('reset')}>
                Set new password →
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <input
                className="login-input"
                type="email"
                placeholder="Penn email address"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                required
              />
              {error && <div className="login-error">{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Get reset token'}
              </button>
            </form>
          )}
        </>
      )}

      {/* ── Reset password ── */}
      {mode === 'reset' && (
        <>
          <div className="login-back-row">
            <button className="login-back-link" type="button" onClick={() => switchMode('forgot')}>
              ← Back
            </button>
          </div>
          <h2 className="login-section-title">Set New Password</h2>
          <p className="login-section-sub">Enter your reset token and choose a new password.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <input
              className="login-input"
              type="text"
              placeholder="Reset token"
              value={resetTokenInput}
              onChange={e => setResetTokenInput(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="New password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="Confirm new password"
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              required
            />
            {error && <div className="login-error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </>
      )}

      {/* ── Login / Register ── */}
      {(mode === 'login' || mode === 'register') && (
        <>
          <div className="login-toggle">
            <button
              className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >Sign In</button>
            <button
              className={`toggle-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >Create Account</button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <input
                className="login-input"
                type="text"
                placeholder="Full name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            )}
            <input
              className="login-input"
              type="email"
              placeholder="Penn email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {mode === 'register' && (
              <>
                <select
                  className="login-input login-select"
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                >
                  <option value="">Select your school (optional)</option>
                  {PENN_SCHOOLS.map(s => (
                    <option key={s} value={s}>{SCHOOL_SHORT[s] || s}</option>
                  ))}
                </select>
                <select
                  className="login-input login-select"
                  value={gradYear}
                  onChange={e => setGradYear(e.target.value)}
                >
                  <option value="">Graduation year (optional)</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {error && <div className="login-error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') :
                         (mode === 'login' ? 'Sign In' : 'Get Started')}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="login-forgot-link"
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </button>
            )}
          </form>
        </>
      )}
    </div>
  )
}
