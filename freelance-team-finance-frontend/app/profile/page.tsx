"use client"

import { useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { useAuth } from "@/contexts/auth-context"
import { apiClient } from "@/lib/api"
import { Lock, User, CheckCircle, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const { user, hasPin, setHasPin, refreshAuth } = useAuth()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const p = pin.replace(/\D/g, "").slice(0, 4)
    const c = confirmPin.replace(/\D/g, "").slice(0, 4)
    if (p.length !== 4) {
      setMessage({ type: "error", text: "PIN must be exactly 4 digits." })
      return
    }
    if (p !== c) {
      setMessage({ type: "error", text: "PIN and confirmation do not match." })
      return
    }
    setLoading(true)
    try {
      await apiClient.setPin(p)
      setHasPin(true)
      await refreshAuth()
      setPin("")
      setConfirmPin("")
      setMessage({ type: "success", text: "PIN set successfully. The panel will lock after 15 minutes of inactivity." })
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || err?.error || "Failed to set PIN." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModernMainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account and session security</p>
        </div>

        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <ModernCardTitle>Account</ModernCardTitle>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="space-y-2">
            <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {user?.name}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {user?.email}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Role:</span> {user?.role}</p>
          </ModernCardContent>
        </ModernCard>

        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <ModernCardTitle>Session PIN</ModernCardTitle>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <p className="text-sm text-gray-600 mb-4">
              {hasPin
                ? "Set a new 4-digit PIN to lock the panel after 15 minutes of inactivity. Enter the same PIN to unlock."
                : "Set a 4-digit PIN to lock the panel after 15 minutes of inactivity. This adds extra security for your finance data."}
            </p>
            <form onSubmit={handleSetPin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
                <ModernInput
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="font-mono text-lg tracking-widest"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                <ModernInput
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="font-mono text-lg tracking-widest"
                  autoComplete="off"
                />
              </div>
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  {message.type === "success" ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                  {message.text}
                </div>
              )}
              <ModernButton type="submit" disabled={loading}>
                {hasPin ? "Update PIN" : "Set PIN"}
              </ModernButton>
            </form>
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}
