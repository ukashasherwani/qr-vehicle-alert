const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const backendUrl = /^https?:\/\//.test(configuredBackendUrl)
  ? configuredBackendUrl.replace(/\/$/, '')
  : 'http://localhost:5000'
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL = (configuredApiUrl && /^https?:\/\//.test(configuredApiUrl))
  ? configuredApiUrl.replace(/\/$/, '')
  : `${backendUrl}/api`

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export const socketUrl = (import.meta.env.VITE_SOCKET_URL && /^https?:\/\//.test(import.meta.env.VITE_SOCKET_URL))
  ? import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '')
  : backendUrl
