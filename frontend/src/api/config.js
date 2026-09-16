export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
export const API_BASE_URL = `${BACKEND_URL}/api`

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

