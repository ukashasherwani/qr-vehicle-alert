const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const backendUrl = /^https?:\/\//.test(configuredBackendUrl)
  ? configuredBackendUrl.replace(/\/$/, '')
  : 'http://localhost:5000'
const API_BASE_URL = `${backendUrl}/api`

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export const socketUrl = backendUrl
