// Web Push subscription helper
export const VAPID_PUBLIC_KEY = 'BOPLUgp6_KygyjDZsd_M3yvcV8zMvoiOmRFr4ZhQrMLahhEANGcriQ8chhumYBpL6kZpIrBYTq8AFUBUt_XQvhE'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw      = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    console.log('SW registered')
    return reg
  } catch (e) {
    console.warn('SW registration failed', e)
    return null
  }
}

export async function subscribeToPush(token) {
  if (!('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(subscription.toJSON()),
    })
  } catch (e) {
    console.warn('Push subscription failed', e)
  }
}
