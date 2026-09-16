const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')
const API_BASE_URL = `${backendUrl}/api`

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export const socketUrl = backendUrl
