import { useState, useEffect } from 'react'

const ACHIEVEMENTS = [
  { id: 'first_bet',      icon: '🎯', title: 'First Bet',       desc: 'Place your first bet',           color: '#3b82f6', reward: 50  },
  { id: 'market_maven',   icon: '📊', title: 'Market Maven',    desc: 'Traded in 10+ markets',          color: '#06b6d4', reward: 100 },
  { id: 'high_roller',    icon: '👑', title: 'High Roller',     desc: 'Bet 1000+ Liberty Bucks',        color: '#f59e0b', reward: 200 },
  { id: 'hot_streak',     icon: '🔥', title: 'Hot Streak',      desc: '3 consecutive wins',             color: '#ef4444', reward: 150 },
  { id: 'prediction_pro', icon: '🔮', title: 'Prediction Pro',  desc: '75%+ win rate (20 markets)',     color: '#8b5cf6', reward: 500 },
  { id: 'early_bird',     icon: '⭐', title: 'Early Bird',      desc: 'First 100 bets on a market',     color: '#10b981', reward: 75  },
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

const PENN_SCHOOLS = Object.keys(SCHOOL_SHORT)

function unlockedAchievements(stats, totalBets) {
  const unlocked = new Set()
  if (totalBets >= 1)                              unlocked.add('first_bet')
  if (stats.total_bets >= 10)                      unlocked.add('market_maven')
  if (stats.total_wagered >= 1000)                 unlocked.add('high_roller')
  if (stats.best_streak >= 3)                      unlocked.add('hot_streak')
  if (stats.win_rate >= 75 && stats.total_bets >= 20) unlocked.add('prediction_pro')
  return unlocked
}

function LeaderboardRow({ rank, user, isMe, token, onFollowChange }) {
  const initials = user.avatar_initials || user.display_name?.split(' ').map(w => w[0]).join('').slice(0,2) || '?'
  const [following, setFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)

  useEffect(() => {
    if (isMe || !user.auth0_id) return
    fetch(`/api/users/${encodeURIComponent(user.auth0_id)}/follow-status`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => setFollowing(d.following)).catch(() => {})
  }, [user.auth0_id])

  const toggleFollow = async (e) => {
    e.stopPropagation()
    setLoadingFollow(true)
    const method = following ? 'DELETE' : 'POST'
    await fetch(`/api/users/${encodeURIComponent(user.auth0_id)}/follow`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    })
    const nowFollowing = !following
    setFollowing(nowFollowing)
    setLoadingFollow(false)
    if (onFollowChange) onFollowChange(user.auth0_id, nowFollowing)
  }

  return (
    <div className={`lb-row ${isMe ? 'lb-row-me' : ''}`}>
      <div className={`lb-rank ${rank <= 3 ? `top-${rank}` : ''}`}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
      </div>
      <div className="lb-avatar">{initials}</div>
      <div className="lb-name">
        <div className="lb-display-name">{user.display_name}</div>
        <div className="lb-username">{user.username}</div>
      </div>
      <div className="lb-balance">{(user.balance || 0).toLocaleString()} LB</div>
      {!isMe && (
        <button
          className={`follow-btn ${following ? 'following' : ''}`}
          onClick={toggleFollow}
          disabled={loadingFollow}
        >
          {following ? 'Following' : '+ Follow'}
        </button>
      )}
    </div>
  )
}

function SocialUserRow({ user, isMe, token, initialFollowing, onFollowChange }) {
  const initials = user.avatar_initials || user.display_name?.split(' ').map(w => w[0]).join('').slice(0,2) || '?'
  const [following, setFollowing] = useState(initialFollowing ?? false)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const method = following ? 'DELETE' : 'POST'
    await fetch(`/api/users/${encodeURIComponent(user.auth0_id)}/follow`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
    const nowFollowing = !following
    setFollowing(nowFollowing)
    setLoading(false)
    if (onFollowChange) onFollowChange(user.auth0_id, nowFollowing)
  }

  return (
    <div className="social-user-row">
      <div className="lb-avatar" style={{ width: 38, height: 38, fontSize: 14 }}>{initials}</div>
      <div className="lb-name" style={{ flex: 1 }}>
        <div className="lb-display-name">{user.display_name}</div>
        <div className="lb-username">{user.username}</div>
      </div>
      {!isMe && (
        <button
          className={`follow-btn ${following ? 'following' : ''}`}
          onClick={toggle}
          disabled={loading}
        >
          {following ? 'Following' : '+ Follow'}
        </button>
      )}
    </div>
  )
}

export default function ProfileScreen({ user: initialUser, onLogout, onUserUpdate, onAchievementUnlocked }) {
  const [user, setUser]             = useState(initialUser)
  const [stats, setStats]           = useState(null)
  const [lbMode, setLbMode]         = useState('global')
  const [leaderboard, setLeaderboard] = useState([])
  const [lbLoading, setLbLoading]   = useState(true)
  const [editing, setEditing]       = useState(false)
  const [editSchool, setEditSchool] = useState(initialUser.school || '')
  const [editYear, setEditYear]     = useState(initialUser.graduation_year ? String(initialUser.graduation_year) : '')
  const [editName, setEditName]     = useState(initialUser.display_name || '')
  const [saving, setSaving]         = useState(false)

  // Social
  const [socialTab, setSocialTab]     = useState('following')  // 'following' | 'followers'
  const [following, setFollowing]     = useState([])
  const [followers, setFollowers]     = useState([])
  const [socialLoaded, setSocialLoaded] = useState(false)

  // Groups (custom leaderboards)
  const [myGroups, setMyGroups]           = useState([])
  const [groupsLoaded, setGroupsLoaded]   = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName]   = useState('')
  const [newGroupPublic, setNewGroupPublic] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [joinCode, setJoinCode]           = useState('')
  const [joiningGroup, setJoiningGroup]   = useState(false)
  const [groupMsg, setGroupMsg]           = useState('')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [groupRankings, setGroupRankings] = useState({})

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/users/me/stats', { headers })
      .then(r => r.json())
      .then(s => { if (s.total_bets !== undefined) setStats(s) })
      .catch(() => {})

    fetch('/api/achievements/check', { method: 'POST', headers })
      .then(r => r.json())
      .then(data => {
        if (data.newly_granted?.length > 0 && onAchievementUnlocked) {
          fetch('/api/users/me', { headers })
            .then(r => r.json())
            .then(u => { if (u.display_name) { setUser(u); onUserUpdate(u) } })
            .catch(() => {})
          data.newly_granted.forEach(a => onAchievementUnlocked(a))
        }
      })
      .catch(() => {})

    // Refresh user to get latest followers/following arrays
    fetch('/api/users/me', { headers })
      .then(r => r.json())
      .then(u => { if (u.display_name) setUser(u) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLbLoading(true)
    let url = '/api/leaderboard/global?limit=20'
    if (lbMode === 'school' && user.school) {
      url = `/api/leaderboard/school?school=${encodeURIComponent(user.school)}&limit=20`
    } else if (lbMode === 'year' && user.graduation_year) {
      url = `/api/leaderboard/year?year=${user.graduation_year}&limit=20`
    }
    fetch(url)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLeaderboard(data); setLbLoading(false) })
      .catch(() => setLbLoading(false))
  }, [lbMode, user.school, user.graduation_year])

  // Lazy-load social lists when section is first opened
  const loadSocial = () => {
    if (socialLoaded) return
    setSocialLoaded(true)
    fetch('/api/users/me/following', { headers })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setFollowing(d) }).catch(() => {})
    fetch('/api/users/me/followers', { headers })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setFollowers(d) }).catch(() => {})
  }

  const loadGroups = () => {
    if (groupsLoaded) return
    setGroupsLoaded(true)
    fetch('/api/leaderboards/mine', { headers })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setMyGroups(d) }).catch(() => {})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:    editName,
          school:          editSchool || null,
          graduation_year: editYear ? parseInt(editYear) : null,
        })
      })
      const data = await res.json()
      if (data.display_name) {
        setUser(data)
        onUserUpdate(data)
        setEditing(false)
      }
    } catch {}
    setSaving(false)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      const res  = await fetch('/api/leaderboards', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), is_public: newGroupPublic })
      })
      const data = await res.json()
      if (data._id) {
        setMyGroups(g => [data, ...g])
        setShowCreateGroup(false)
        setNewGroupName('')
        setGroupMsg(`Group "${data.name}" created! Invite code: ${data.invite_code}`)
      }
    } catch {}
    setCreatingGroup(false)
  }

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return
    setJoiningGroup(true)
    setGroupMsg('')
    try {
      const res  = await fetch(`/api/leaderboards/join/${joinCode.trim().toUpperCase()}`, {
        method: 'POST',
        headers
      })
      const data = await res.json()
      if (data.leaderboard_id) {
        setGroupMsg('Joined! Refreshing groups…')
        setJoinCode('')
        setGroupsLoaded(false)
        // Refresh
        fetch('/api/leaderboards/mine', { headers })
          .then(r => r.json()).then(d => { if (Array.isArray(d)) { setMyGroups(d); setGroupsLoaded(true) } }).catch(() => {})
      } else {
        setGroupMsg(data.error || 'Invalid invite code')
      }
    } catch {
      setGroupMsg('Network error')
    }
    setJoiningGroup(false)
  }

  const loadGroupRankings = async (groupId) => {
    if (groupRankings[groupId]) { setExpandedGroup(expandedGroup === groupId ? null : groupId); return }
    const res  = await fetch(`/api/leaderboards/${groupId}`, { headers })
    const data = await res.json()
    if (data.rankings) setGroupRankings(r => ({ ...r, [groupId]: data.rankings }))
    setExpandedGroup(groupId)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, i) => currentYear + i)

  const totalBets    = stats?.total_bets ?? 0
  const unlocked     = stats ? unlockedAchievements(stats, totalBets) : new Set()
  const schoolShort  = SCHOOL_SHORT[user.school] || user.school || 'No school set'
  const gradLabel    = user.graduation_year ? `'${String(user.graduation_year).slice(2)}` : ''
  const followerCount  = (user.followers || []).length
  const followingCount = (user.following || []).length

  return (
    <div className="profile-screen">
      {/* Header */}
      <div className="profile-topbar">
        <div>
          <h1>Profile</h1>
          <p className="profile-handle">{user.username || '@you'}</p>
        </div>
        <div className="profile-topbar-actions">
          {!editing && (
            <button className="profile-settings-btn" onClick={() => setEditing(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="profile-edit-card">
          <h3 className="profile-edit-title">Edit Profile</h3>
          <input
            className="profile-edit-input"
            placeholder="Display name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
          <select
            className="profile-edit-input"
            value={editSchool}
            onChange={e => setEditSchool(e.target.value)}
          >
            <option value="">No school set</option>
            {PENN_SCHOOLS.map(s => <option key={s} value={s}>{SCHOOL_SHORT[s]}</option>)}
          </select>
          <select
            className="profile-edit-input"
            value={editYear}
            onChange={e => setEditYear(e.target.value)}
          >
            <option value="">No grad year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="profile-edit-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* User card */}
      {!editing && (
        <div className="profile-user-card">
          <div className="profile-avatar">
            {user.avatar_initials || user.display_name?.[0] || '?'}
          </div>
          <div className="profile-user-info">
            <div className="profile-name">{user.display_name}</div>
            {(user.school || user.graduation_year) && (
              <div className="profile-school-badge">
                {schoolShort}{gradLabel ? ` ${gradLabel}` : ''}
              </div>
            )}
            <div className="profile-social-counts">
              <span>{followingCount} <span className="social-count-label">Following</span></span>
              <span className="social-count-sep">·</span>
              <span>{followerCount} <span className="social-count-label">Followers</span></span>
            </div>
          </div>
          <div className="profile-stats-mini">
            <div className="profile-stat-mini">
              <div className="profile-stat-val">{stats?.won_bets ?? '—'}</div>
              <div className="profile-stat-lbl">Markets Won</div>
            </div>
            <div className="profile-stat-mini">
              <div className="profile-stat-val">{stats ? `${stats.win_rate}%` : '—'}</div>
              <div className="profile-stat-lbl">Win Rate</div>
            </div>
            <div className="profile-stat-mini">
              <div className="profile-stat-val">#{stats?.rank ?? '—'}</div>
              <div className="profile-stat-lbl">Rank</div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && !editing && (
        <div className="profile-stats-card">
          <h2 className="section-title">Statistics</h2>
          <div className="stat-row">
            <div className="stat-row-icon" style={{ background: '#dcfce7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00a63e" strokeWidth="2" width="18" height="18">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div className="stat-row-info">
              <div className="stat-row-label">Total Profit</div>
              <div className="stat-row-sub">All-time earnings</div>
            </div>
            <div className={`stat-row-value ${stats.total_profit >= 0 ? 'green' : 'red'}`}>
              {stats.total_profit >= 0 ? '+' : ''}{stats.total_profit.toLocaleString()} LB
            </div>
          </div>
          <div className="stat-row">
            <div className="stat-row-icon" style={{ background: '#dbeafe' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="18" height="18">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="stat-row-info">
              <div className="stat-row-label">Total Markets</div>
              <div className="stat-row-sub">Markets traded in</div>
            </div>
            <div className="stat-row-value">{stats.total_bets}</div>
          </div>
          <div className="stat-row">
            <div className="stat-row-icon" style={{ background: '#fef3c7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="18" height="18">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
                <path d="M4 22h16"/>
                <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
              </svg>
            </div>
            <div className="stat-row-info">
              <div className="stat-row-label">Best Streak</div>
              <div className="stat-row-sub">Consecutive wins</div>
            </div>
            <div className="stat-row-value">{stats.best_streak}</div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {!editing && (
        <div className="achievements-section">
          <h2 className="section-title">Achievements</h2>
          <div className="achievements-grid">
            {ACHIEVEMENTS.map(a => {
              const isUnlocked = unlocked.has(a.id)
              return (
                <div
                  key={a.id}
                  className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  style={isUnlocked ? { background: a.color } : {}}
                >
                  <div className="achievement-icon">{isUnlocked ? a.icon : '🔒'}</div>
                  <div className="achievement-title">{a.title}</div>
                  <div className="achievement-desc">{a.desc}</div>
                  <div className="achievement-reward">{isUnlocked ? `+${a.reward} LB` : `${a.reward} LB`}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Social section ── */}
      {!editing && (
        <div className="leaderboard-section">
          <h2 className="section-title">Social</h2>
          <div className="lb-mode-tabs">
            <button
              className={`lb-mode-tab ${socialTab === 'following' ? 'active' : ''}`}
              onClick={() => { setSocialTab('following'); loadSocial() }}
            >
              Following ({followingCount})
            </button>
            <button
              className={`lb-mode-tab ${socialTab === 'followers' ? 'active' : ''}`}
              onClick={() => { setSocialTab('followers'); loadSocial() }}
            >
              Followers ({followerCount})
            </button>
          </div>

          {!socialLoaded && (
            <div className="empty-state" style={{ fontSize: 13, padding: '12px 0' }}>
              Tap a tab to load your social graph
            </div>
          )}

          {socialLoaded && socialTab === 'following' && (
            following.length === 0
              ? <div className="empty-state">You're not following anyone yet — follow people on the leaderboard!</div>
              : <div className="leaderboard-list">
                  {following.map(u => (
                    <SocialUserRow
                      key={u.auth0_id}
                      user={u}
                      isMe={u.auth0_id === user.auth0_id}
                      token={token}
                      initialFollowing={true}
                    />
                  ))}
                </div>
          )}

          {socialLoaded && socialTab === 'followers' && (
            followers.length === 0
              ? <div className="empty-state">No followers yet</div>
              : <div className="leaderboard-list">
                  {followers.map(u => (
                    <SocialUserRow
                      key={u.auth0_id}
                      user={u}
                      isMe={u.auth0_id === user.auth0_id}
                      token={token}
                      initialFollowing={(user.following || []).includes(u.auth0_id)}
                    />
                  ))}
                </div>
          )}
        </div>
      )}

      {/* ── Leaderboard section ── */}
      {!editing && (
        <div className="leaderboard-section">
          <h2 className="section-title">Leaderboard</h2>

          <div className="lb-mode-tabs">
            <button
              className={`lb-mode-tab ${lbMode === 'global' ? 'active' : ''}`}
              onClick={() => setLbMode('global')}
            >Penn</button>
            {user.school && (
              <button
                className={`lb-mode-tab ${lbMode === 'school' ? 'active' : ''}`}
                onClick={() => setLbMode('school')}
              >{SCHOOL_SHORT[user.school] || 'School'}</button>
            )}
            {user.graduation_year && (
              <button
                className={`lb-mode-tab ${lbMode === 'year' ? 'active' : ''}`}
                onClick={() => setLbMode('year')}
              >Class of {user.graduation_year}</button>
            )}
          </div>

          {!user.school && lbMode !== 'global' && (
            <div className="lb-setup-hint">
              Set your school to see school and class leaderboards
            </div>
          )}

          {lbLoading ? (
            <div className="loading-text">Loading…</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">No rankings yet</div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((u, i) => (
                <LeaderboardRow
                  key={u.auth0_id || i}
                  rank={i + 1}
                  user={u}
                  isMe={u.auth0_id === user.auth0_id}
                  token={token}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Groups section ── */}
      {!editing && (
        <div className="leaderboard-section" onClick={loadGroups}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Groups</h2>
            <button
              className="follow-btn"
              style={{ fontSize: 12, padding: '5px 10px' }}
              onClick={e => { e.stopPropagation(); loadGroups(); setShowCreateGroup(v => !v); setGroupMsg('') }}
            >
              + New Group
            </button>
          </div>

          {/* Create group modal */}
          {showCreateGroup && (
            <div className="profile-edit-card" style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
              <h3 className="profile-edit-title">Create a Group</h3>
              <input
                className="profile-edit-input"
                placeholder="Group name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
              />
              <label className="group-public-label">
                <input
                  type="checkbox"
                  checked={newGroupPublic}
                  onChange={e => setNewGroupPublic(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Public group
              </label>
              <div className="profile-edit-actions">
                <button className="btn-primary" onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
                  {creatingGroup ? 'Creating…' : 'Create'}
                </button>
                <button className="btn-secondary" onClick={() => setShowCreateGroup(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Join with invite code */}
          <div className="group-join-row" onClick={e => e.stopPropagation()}>
            <input
              className="profile-edit-input"
              placeholder="Invite code (e.g. ABC123)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              style={{ marginBottom: 0 }}
            />
            <button
              className="follow-btn"
              style={{ marginLeft: 8, whiteSpace: 'nowrap' }}
              onClick={handleJoinGroup}
              disabled={joiningGroup || !joinCode.trim()}
            >
              {joiningGroup ? '…' : 'Join'}
            </button>
          </div>
          {groupMsg && <div className="lb-setup-hint" style={{ color: groupMsg.includes('created') || groupMsg.includes('Joined') ? '#00a63e' : '#e7000b' }}>{groupMsg}</div>}

          {/* Groups list */}
          {groupsLoaded && myGroups.length === 0 && (
            <div className="empty-state">No groups yet — create one or join with an invite code</div>
          )}

          {groupsLoaded && myGroups.map(group => (
            <div key={group._id} className="group-card">
              <div
                className="group-card-header"
                onClick={e => { e.stopPropagation(); loadGroupRankings(group._id) }}
              >
                <div className="group-card-info">
                  <div className="lb-display-name">{group.name}</div>
                  <div className="lb-username">
                    Code: <code style={{ fontWeight: 600, letterSpacing: 1 }}>{group.invite_code}</code>
                    {' · '}{group.member_ids?.length || 1} member{group.member_ids?.length !== 1 ? 's' : ''}
                    {group.is_public && ' · Public'}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  width="16" height="16"
                  style={{ transform: expandedGroup === group._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>

              {expandedGroup === group._id && groupRankings[group._id] && (
                <div className="group-rankings">
                  {groupRankings[group._id].map((u, i) => (
                    <div key={u.auth0_id || i} className={`lb-row ${u.auth0_id === user.auth0_id ? 'lb-row-me' : ''}`} style={{ padding: '6px 0' }}>
                      <div className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
                      <div className="lb-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {u.avatar_initials || '?'}
                      </div>
                      <div className="lb-name" style={{ flex: 1 }}>
                        <div className="lb-display-name">{u.display_name}</div>
                      </div>
                      <div className="lb-balance">{(u.balance || 0).toLocaleString()} LB</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sign out */}
      {!editing && (
        <div className="profile-signout">
          <button className="signout-btn" onClick={onLogout}>Sign Out</button>
        </div>
      )}
    </div>
  )
}
