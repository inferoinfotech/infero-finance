"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen || !account) return null

  const modalContent = (
    <div 
      data-modal-backdrop
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <ModernCard className="w-full max-w-2xl">
          <ModernCardHeader>
            <div className="flex justify-between items-center">
              <ModernCardTitle className="text-2xl">Edit Account</ModernCardTitle>
              <ModernButton variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </ModernButton>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{errors.submit}</div>
              )}

              <ModernSelect
                label="Account Type *"
                name="type"
                value={formData.type}
                onChange={handleChange}
                error={errors.type}
                options={[
                  { value: "bank", label: "Bank Account" },
                  { value: "wallet", label: "Digital Wallet" }
                ]}
              />

              <ModernInput
                label="Account Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., HDFC Savings, PayPal"
                error={errors.name}
              />

              <ModernInput
                label="Account Details *"
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Account number, email, or other identifying details"
                error={errors.details}
              />

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" disabled={loading} className="flex-1">
                  {loading ? "Updating..." : "Update Account"}
                </ModernButton>
                <ModernButton type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </ModernButton>
              </div>
            </form>
          </ModernCardContent>
        </ModernCard>
      </div>
    </div>
  )

  // Use Portal to render outside normal DOM hierarchy
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return null
}
