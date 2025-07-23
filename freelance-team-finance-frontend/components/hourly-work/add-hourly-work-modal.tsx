"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  }, [editLog, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    if (!weekStart) {
      setError("Week start date required")
      setLoading(false)
      return
    }
    if (!hours || Number(hours) <= 0) {
      setError("Hours must be greater than 0")
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{editLog ? "Edit" : "Add"} Weekly Hours</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-100 text-red-700 rounded p-2">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Week Start *</label>
              <Input
                name="weekStart"
                type="date"
                value={weekStart}
                onChange={e => setWeekStart(e.target.value)}
                required
                disabled={!!editLog} // Only editable for add, not edit
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hours *</label>
              <Input
                name="hours"
                type="number"
                step="0.01"
                value={hours}
                onChange={e => setHours(e.target.value)}
                required
                min={0.01}
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (editLog ? "Updating..." : "Adding...") : (editLog ? "Update" : "Add")}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
