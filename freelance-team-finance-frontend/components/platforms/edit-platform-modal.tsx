"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { X } from "lucide-react"

interface Platform {
  _id: string
  name: string
  url?: string
  description?: string
  commission?: number
}

interface EditPlatformModalProps {
  platform: Platform | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditPlatformModal({ platform, isOpen, onClose, onSuccess }: EditPlatformModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    commission: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && platform) {
      setFormData({
        name: platform.name,
        url: platform.url || "",
        description: platform.description || "",
        commission: platform.commission?.toString() || "",
      })
    }
  }, [isOpen, platform])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Platform name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !platform) {
      return
    }

    setLoading(true)
    try {
      const platformData = {
        name: formData.name.trim(),
        url: formData.url.trim() || undefined,
        description: formData.description.trim() || undefined,
        commission: formData.commission ? Number(formData.commission) : undefined,
      }

      await apiClient.request(`/api/platforms/${platform._id}`, {
        method: "PUT",
        body: JSON.stringify(platformData),
      })

      setErrors({})
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Failed to update platform:", error)
      setErrors({ submit: "Failed to update platform. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  if (!isOpen || !platform) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Edit Platform</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{errors.submit}</div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Platform Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Upwork, Fiverr, Freelancer"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website URL</label>
              <Input name="url" value={formData.url} onChange={handleChange} placeholder="https://www.platform.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Commission (%)</label>
              <Input
                name="commission"
                type="number"
                step="0.01"
                value={formData.commission}
                onChange={handleChange}
                placeholder="e.g., 10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the platform"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating..." : "Update Platform"}
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
