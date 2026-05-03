// Lightweight Funnel-Tracking. Fire-and-forget, blockt nie die UI.
// Backend-Whitelist: pricing_view, package_click, checkout_start, checkout_error
import { API_BASE } from '../config';

const SESSION_KEY = 'amlaki_session_id';

function getSessionId() {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

export function track(event, properties) {
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/track-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event,
        session_id: getSessionId(),
        properties: properties || null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking darf NIE den App-Flow brechen
  }
}
