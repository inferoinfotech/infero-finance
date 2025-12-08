"use client"
import { useState, useEffect } from "react"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernButton } from "@/components/ui/modern-button"
import { X } from "lucide-react"
import { apiClient } from "@/lib/api"

interface AddHourlyWorkModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  // for editing (optional)
  editLog?: HourlyWorkLog | null
}

export interface HourlyWorkLog {
  _id: string
  weekStart: string
  hours: number
  user: { name: string, email: string, _id: string }
  billed: boolean
}

export function AddHourlyWorkModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  editLog,
}: AddHourlyWorkModalProps) {
  const [weekStart, setWeekStart] = useState("")
  const [hours, setHours] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ weekStart?: string; hours?: string }>({})

  // Pre-fill fields if editing
  useEffect(() => {
    if (editLog) {
      setWeekStart(editLog.weekStart.split("T")[0])
      setHours(editLog.hours.toString())
    } else {
      setWeekStart("") // Or set to current week's Monday
      setHours("")
    }
    setError("")
    setFieldErrors({})
  }, [editLog, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFieldErrors({})
    
    const newFieldErrors: { weekStart?: string; hours?: string } = {}
    if (!weekStart) {
      newFieldErrors.weekStart = "Week start date required"
    }
    if (!hours || Number(hours) <= 0) {
      newFieldErrors.hours = "Hours must be greater than 0"
    }
    
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors)
      setLoading(false)
      return
    }
    
    try {
      if (editLog) {
        await apiClient.updateHourlyWork(editLog._id, { hours: Number(hours) })
      } else {
        await apiClient.createHourlyWork({
          project: projectId,
          weekStart,
          hours: Number(hours),
        })
      }
      onSuccess()
      onClose()
    } catch {
      setError("Failed to save. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <ModernCard className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <ModernCardHeader>
          <div className="flex justify-between items-center">
            <ModernCardTitle>{editLog ? "Edit" : "Add"} Weekly Hours</ModernCardTitle>
            <ModernButton variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </ModernButton>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <ModernInput
              name="weekStart"
              type="date"
              value={weekStart}
              onChange={e => {
                setWeekStart(e.target.value)
                if (fieldErrors.weekStart) setFieldErrors({ ...fieldErrors, weekStart: undefined })
              }}
              label="Week Start *"
              error={fieldErrors.weekStart}
              required
              disabled={!!editLog}
            />
            <ModernInput
              name="hours"
              type="number"
              step="0.01"
              value={hours}
              onChange={e => {
                setHours(e.target.value)
                if (fieldErrors.hours) setFieldErrors({ ...fieldErrors, hours: undefined })
              }}
              label="Hours *"
              error={fieldErrors.hours}
              required
              min={0.01}
            />
            <div className="flex gap-4 pt-2">
              <ModernButton type="submit" disabled={loading} className="flex-1" loading={loading}>
                {loading ? (editLog ? "Updating..." : "Adding...") : (editLog ? "Update" : "Add")}
              </ModernButton>
              <ModernButton type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </ModernButton>
            </div>
          </form>
        </ModernCardContent>
      </ModernCard>
    </div>
  )
}
