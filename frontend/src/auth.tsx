import React, { createContext, useContext, useEffect, useState, } from 'react'
import type { JSX, ReactNode } from 'react'
import { getCurrentUser, login as apiLogin, logout as apiLogout } from './api/auth'

type User = any

const AuthContext = createContext<{
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}>({ user: null, loading: true, login: async ()=>null, logout: async ()=>{} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetch() {
      try {
        const u = await getCurrentUser()
        if (mounted) setUser(u)
      } catch (err) {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetch()
    return () => { mounted = false }
  }, [])

  async function login(email: string, password: string) {
    const u = await apiLogin(email, password)
    setUser(u)
    return u
  }

  async function logout() {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// ProtectedRoute as a function wrapper for react-router v6
import { Navigate, useLocation } from 'react-router-dom'
export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}
