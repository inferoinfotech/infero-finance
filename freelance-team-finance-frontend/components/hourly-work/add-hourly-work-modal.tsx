// components/hourly-work/add-hourly-work-modal.tsx
"use client"

import { useState } from "react"
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
}

export function AddHourlyWorkModal({ projectId, isOpen, onClose, onSuccess }: AddHourlyWorkModalProps) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    hours: "",
    note: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    if (!form.hours || Number(form.hours) <= 0) {
      setError("Hours must be greater than 0")
      setLoading(false)
      return
    }
    try {
      await apiClient.createHourlyWork({
        project: projectId,
        date: form.date,
        hours: Number(form.hours),
        note: form.note,
      })
      setForm({ date: new Date().toISOString().split("T")[0], hours: "", note: "" })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError("Failed to add hours. Try again.")
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
            <CardTitle>Add Hours</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-100 text-red-700 rounded p-2">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hours *</label>
              <Input
                name="hours"
                type="number"
                step="0.01"
                value={form.hours}
                onChange={handleChange}
                required
                min={0.01}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="Task description"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Adding..." : "Add Hours"}
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
