"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { apiClient } from "@/lib/api"

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000   // check every minute

interface PinLockContextType {
  locked: boolean
  unlock: (pin: string) => Promise<boolean>
}

const PinLockContext = createContext<PinLockContextType | undefined>(undefined)

export function PinLockProvider({ children }: { children: React.ReactNode }) {
  const { user, token, hasPin } = useAuth()
  const [locked, setLocked] = useState(false)
  const lastActivityRef = useRef<number>(Date.now())
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    try {
      await apiClient.verifyPin(pin)
      lastActivityRef.current = Date.now()
      setLocked(false)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!token || !user) {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current)
        checkTimerRef.current = null
      }
      setLocked(false)
      return
    }

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]
    events.forEach((ev) => window.addEventListener(ev, updateActivity))
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity))
    }
  }, [token, user])

  useEffect(() => {
    if (!token || !user || !hasPin) return

    checkTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= INACTIVITY_MS) {
        setLocked(true)
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current)
        checkTimerRef.current = null
      }
    }
  }, [token, user, hasPin])

  return (
    <PinLockContext.Provider value={{ locked, unlock }}>
      {children}
      {locked && <PinLockOverlay onUnlock={unlock} />}
    </PinLockContext.Provider>
  )
}

function PinLockOverlay({ onUnlock }: { onUnlock: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const p = pin.replace(/\D/g, "").slice(0, 4)
    if (p.length !== 4) {
      setError("Enter 4 digits")
      return
    }
    setSubmitting(true)
    const ok = await onUnlock(p)
    setSubmitting(false)
    if (ok) {
      setPin("")
    } else {
      setError("Incorrect PIN")
      setPin("")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Session locked</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your 4-digit PIN to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              setError("")
            }}
            className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 px-4 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            autoFocus
            autoComplete="off"
            disabled={submitting}
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            disabled={submitting || pin.length !== 4}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  )
}

export function usePinLock() {
  const context = useContext(PinLockContext)
  if (context === undefined) {
    throw new Error("usePinLock must be used within a PinLockProvider")
  }
  return context
}
