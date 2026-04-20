import { useState, useEffect, useCallback } from 'react'
import { registerServiceWorker, subscribeToPush } from './push.js'
import LoginScreen from './pages/LoginScreen.jsx'
import HomeScreen from './pages/HomeScreen.jsx'
import MarketDetailScreen from './pages/MarketDetailScreen.jsx'
import WalletScreen from './pages/WalletScreen.jsx'
import ResultsScreen from './pages/ResultsScreen.jsx'
import ProfileScreen from './pages/ProfileScreen.jsx'
import AdminScreen from './pages/AdminScreen.jsx'
import CreateBetScreen from './pages/CreateBetScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

function NotificationPanel({ notifications, onClose, onClear }) {
  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-panel-header">
          <h3>Notifications</h3>
          {notifications.length > 0 && (
            <button className="notif-clear-btn" onClick={onClear}>Clear all</button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="notif-empty">No notifications yet</div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => (
              <div key={n.id} className="notif-item">
                <div className="notif-item-icon">{n.icon}</div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.label}</div>
                  <div className="notif-item-reward">+{n.reward} LB earned</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser]                   = useState(null)
  const [activePage, setActivePage]       = useState('home')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [showCreateBet, setShowCreateBet] = useState(false)
  const [notifications, setNotifications] = useState([])   // all accumulated
  const [unreadCount, setUnreadCount]     = useState(0)
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  // Register service worker on mount
  useEffect(() => { registerServiceWorker() }, [])

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const addNotification = useCallback((notif) => {
    const id = Date.now() + Math.random()
    setNotifications(prev => [{ ...notif, id }, ...prev])
    setUnreadCount(c => c + 1)
  }, [])

  const openNotifPanel = () => {
    setShowNotifPanel(true)
    setUnreadCount(0)
  }

  const handleLogin = (userData, token) => {
    setUser(userData)
    if (token) localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setActivePage('home')

    // Daily bonus claim
    fetch('/api/daily-bonus', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (!data.already_claimed && data.bonus > 0) {
        addNotification({ icon: '🎁', label: 'Daily Bonus', reward: data.bonus })
      }
    }).catch(() => {})

    // Subscribe to push notifications (ask permission first)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') subscribeToPush(token)
      })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPush(token)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const openMarket = (market, prefillSide = null) => {
    setSelectedMarket({ ...market, prefillSide })
  }

  const closeMarket = () => setSelectedMarket(null)

  if (!user) {
    return (
      <div className="phone-shell">
        <div className="screen">
          <LoginScreen onLogin={handleLogin} />
        </div>
      </div>
    )
  }

  // Admin users get the admin panel
  if (user.role === 'admin') {
    return (
      <div className="phone-shell">
        <div className="screen">
          <AdminScreen user={user} onLogout={handleLogout} />
        </div>
      </div>
    )
  }

  const renderPage = () => {
    if (showCreateBet) {
      return (
        <CreateBetScreen
          user={user}
          onBack={() => setShowCreateBet(false)}
          onSubmitted={() => setShowCreateBet(false)}
        />
      )
    }
    if (selectedMarket) {
      return (
        <MarketDetailScreen
          market={selectedMarket}
          user={user}
          onBack={closeMarket}
          onUserUpdate={handleUserUpdate}
          onAchievementUnlocked={addNotification}
        />
      )
    }
    switch (activePage) {
      case 'home':
        return (
          <HomeScreen
            user={user}
            onOpenMarket={openMarket}
            onCreateBet={() => setShowCreateBet(true)}
            unreadCount={unreadCount}
            onBellClick={openNotifPanel}
          />
        )
      case 'wallet':
        return <WalletScreen user={user} />
      case 'results':
        return <ResultsScreen user={user} onUserUpdate={handleUserUpdate} />
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onAchievementUnlocked={addNotification}
          />
        )
      default:
        return (
          <HomeScreen
            user={user}
            onOpenMarket={openMarket}
            onCreateBet={() => setShowCreateBet(true)}
            unreadCount={unreadCount}
            onBellClick={openNotifPanel}
          />
        )
    }
  }

  const hideNav = selectedMarket || showCreateBet

  return (
    <div className="phone-shell">
      <div className="screen">
        {renderPage()}
        {showNotifPanel && (
          <NotificationPanel
            notifications={notifications}
            onClose={() => setShowNotifPanel(false)}
            onClear={() => setNotifications([])}
          />
        )}
      </div>
      {!hideNav && (
        <BottomNav
          activePage={activePage}
          setActivePage={setActivePage}
          onCreateBet={() => setShowCreateBet(true)}
        />
      )}
    </div>
  )
}
