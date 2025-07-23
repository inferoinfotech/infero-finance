"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { X } from "lucide-react"

interface Account {
  _id: string
  type: string
  name: string
  details: string
  balance?: number
}

interface EditAccountModalProps {
  account: Account | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditAccountModal({ account, isOpen, onClose, onSuccess }: EditAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: "bank",
    name: "",
    details: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && account) {
      setFormData({
        type: account.type,
        name: account.name,
        details: account.details,
      })
    }
  }, [isOpen, account])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Account name is required"
    }
    if (!formData.details.trim()) {
      newErrors.details = "Account details are required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !account) {
      return
    }

    setLoading(true)
    try {
      const accountData = {
        type: formData.type,
        name: formData.name.trim(),
        details: formData.details.trim(),
      }

      await apiClient.request(`/api/accounts/${account._id}`, {
        method: "PUT",
        body: JSON.stringify(accountData),
      })

      setErrors({})
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Failed to update account:", error)
      setErrors({ submit: "Failed to update account. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  if (!isOpen || !account) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Edit Account</CardTitle>
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
              <label className="text-sm font-medium">Account Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="bank">Bank Account</option>
                <option value="wallet">Digital Wallet</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., HDFC Savings, PayPal"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Details *</label>
              <Input
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Account number, email, or other identifying details"
                className={errors.details ? "border-red-500" : ""}
              />
              {errors.details && <p className="text-sm text-red-600">{errors.details}</p>}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating..." : "Update Account"}
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
