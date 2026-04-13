const PROD_API_FALLBACK = 'https://almost-there.onrender.com/api'

export function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && typeof fromEnv === 'string') {
    return fromEnv.replace(/\/$/, '')
  }

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api'
  }

  return PROD_API_FALLBACK
}
