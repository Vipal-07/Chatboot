export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export async function showChatNotification({ title, body }) {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && document.visibilityState !== 'visible') {
      reg.showNotification(title, {
        body,
        icon: '/weather-app.png',
        tag: 'chat-msg'
      });
    } else if (document.visibilityState !== 'visible') {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}