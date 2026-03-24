// API Configuration
const getApiBase = () => {
  // Zuerst prüfen ob eine explizite URL gesetzt wurde
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Wenn wir auf localhost sind, verwende localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Production: amlaki.de or Render
  if (window.location.hostname.includes('amlaki.de') || window.location.hostname.includes('vercel.app') || window.location.hostname.includes('onrender.com')) {
    return 'https://amlaki-backend.onrender.com';
  }

  // Sonst (z.B. vom Handy im gleichen Netzwerk), verwende HTTPS
  return `https://${window.location.hostname}:8000`;
};

export const API_BASE = getApiBase();

// Rate-limit-aware fetch wrapper
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter ? parseInt(retryAfter) : 60;
    const minutes = Math.ceil(seconds / 60);
    throw new Error(`Zu viele Anfragen. Bitte warte ${minutes > 1 ? minutes + ' Minuten' : 'einen Moment'} und versuche es erneut.`);
  }

  return response;
}
