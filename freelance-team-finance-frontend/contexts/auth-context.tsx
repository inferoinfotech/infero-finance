"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { apiClient } from "@/lib/api"

export type Role = "admin" | "owner" | "sales" | "developer"

interface User {
  id: string
  name: string
  email: string
  role: Role
}

interface AuthContextType {
  user: User | null
  token: string | null
  hasPin: boolean
  setHasPin: (value: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [hasPin, setHasPinState] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshAuth = async () => {
    const t = localStorage.getItem("token")
    if (!t) return
    try {
      const data = await apiClient.getMe() as { user: User; hasPin: boolean }
      setUser(data.user)
      setHasPinState(!!data.hasPin)
      localStorage.setItem("user", JSON.stringify(data.user))
    } catch {
      setUser(null)
      setToken(null)
      setHasPinState(false)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")
    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        const u = JSON.parse(storedUser)
        setUser(u)
      } catch {
        localStorage.removeItem("user")
      }
      apiClient.getMe()
        .then((data: { user: User; hasPin: boolean }) => {
          setUser(data.user)
          setHasPinState(!!data.hasPin)
          localStorage.setItem("user", JSON.stringify(data.user))
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiClient.login({ email, password })
    const { token: newToken, user: newUser, hasPin: hp } = response as { token: string; user: User; hasPin?: boolean }
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setHasPinState(!!hp)
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await apiClient.register({ name, email, password })
    const { token: newToken, user: newUser } = response as { token: string; user: User }
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setHasPinState(false)
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    setHasPinState(false)
  }

  const setHasPin = (value: boolean) => setHasPinState(value)

  return (
    <AuthContext.Provider value={{ user, token, hasPin, setHasPin, login, register, logout, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
