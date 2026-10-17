/** System notifications, so players see a wake-up or a call back while they're looking at Discord. */

const BASE = import.meta.env.BASE_URL;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Must be called from a click, or browsers ignore it. */
export function askForNotifications() {
  if (!notificationsSupported() || Notification.permission !== 'default') return;
  Notification.requestPermission().catch(() => {});
}

export function notify(title: string, body: string, tag: string) {
  if (document.visibilityState === 'visible' && document.hasFocus()) return;
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, icon: `${BASE}favicon.svg` });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some phones only allow notifications from a service worker */
  }
}
