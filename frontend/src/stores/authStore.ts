import { create } from 'zustand'
import { api, getMe } from '../api/client'

interface User {
  id: number
  username: string
  displayName: string
  email: string
  color: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  checkAuth: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      api.post('/auth/logout').catch(() => {})
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }
    try {
      const user = await getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      // Try refresh
      const newToken = await get().refreshAccessToken()
      if (!newToken) {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    }
  },

  refreshAccessToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return null
    try {
      const res = await api.post('/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefresh } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefresh)
      // Re-fetch user after refresh
      const user = await getMe()
      set({ user, isAuthenticated: true, isLoading: false })
      return accessToken
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ user: null, isAuthenticated: false, isLoading: false })
      return null
    }
  },
}))
