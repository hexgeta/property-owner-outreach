import { useAuth } from '@/lib/AuthContext'
import { useCallback } from 'react'

// Wrapper around fetch that adds auth header automatically
export function useAuthFetch() {
  const { session } = useAuth()

  const authFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      }

      return fetch(url, { ...options, headers })
    },
    [session?.access_token]
  )

  return authFetch
}
