"use client"

import { useEffect, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiClient } from "@/lib/api"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  ExternalLink, 
  Percent, 
  FileText,
  Settings,
  Layers
} from "lucide-react"

interface Platform {
  _id: string
  name: string
  url?: string
  description?: string
  commission?: number
}

export default function ModernPlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    commission: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const data = await apiClient.getPlatforms()
      if (Array.isArray(data)) {
        setPlatforms(data)
      } else if (data && Array.isArray(data.platforms)) {
        setPlatforms(data.platforms)
      } else {
        setPlatforms([])
      }
    } catch (error) {
      console.error("Failed to fetch platforms:", error)
      setPlatforms([])
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Platform name is required"
    if (formData.url && !formData.url.startsWith('http')) {
      newErrors.url = "Please enter a valid URL starting with http:// or https://"
    }
    if (formData.commission && (Number(formData.commission) < 0 || Number(formData.commission) > 100)) {
      newErrors.commission = "Commission must be between 0 and 100"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const platformData = {
        name: formData.name.trim(),
        url: formData.url.trim() || undefined,
        description: formData.description.trim() || undefined,
        commission: formData.commission ? Number(formData.commission) : undefined,
      }

      if (editingPlatform) {
        await apiClient.request(`/api/platforms/${editingPlatform._id}`, {
          method: "PUT",
          body: JSON.stringify(platformData),
        })
      } else {
        await apiClient.createPlatform(platformData)
      }

      setShowAddForm(false)
      setEditingPlatform(null)
      setFormData({ name: "", url: "", description: "", commission: "" })
      setErrors({})
      fetchPlatforms()
    } catch (error) {
      console.error("Failed to save platform:", error)
      setErrors({ submit: "Failed to save platform. Please try again." })
    }
  }

  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform)
    setFormData({
      name: platform.name,
      url: platform.url || "",
      description: platform.description || "",
      commission: platform.commission?.toString() || "",
    })
    setShowAddForm(true)
  }

  const handleDelete = async (platformId: string, platformName: string) => {
    if (window.confirm(`Are you sure you want to delete "${platformName}"? This action cannot be undone.`)) {
      try {
        await apiClient.request(`/api/platforms/${platformId}`, { method: "DELETE" })
        setPlatforms(platforms.filter((p) => p._id !== platformId))
      } catch (error) {
        console.error("Failed to delete platform:", error)
      }
    }
  }

  const closeModal = () => {
    setShowAddForm(false)
    setEditingPlatform(null)
    setFormData({ name: "", url: "", description: "", commission: "" })
    setErrors({})
  }

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        </div>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Platform Management</h1>
            <p className="text-gray-600 text-lg">
              Manage your freelancing platforms and their configurations
            </p>
          </div>
          <ModernButton onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            Add Platform
          </ModernButton>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Platforms</ModernCardTitle>
                  <p className="text-white/80 text-sm">Active platforms</p>
                </div>
                <Layers className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{platforms.length}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">With URLs</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Configured links</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                {platforms.filter(p => p.url).length}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Avg Commission</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Platform fees</p>
                </div>
                <Percent className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                {platforms.filter(p => p.commission).length > 0
                  ? `${(platforms.filter(p => p.commission).reduce((sum, p) => sum + (p.commission || 0), 0) / platforms.filter(p => p.commission).length).toFixed(1)}%`
                  : "—"
                }
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Add/Edit Platform Modal */}
        <Dialog open={showAddForm} onOpenChange={(open) => open ? setShowAddForm(true) : closeModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingPlatform ? "Edit Platform" : "Add New Platform"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Platform Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Upwork, Fiverr, Freelancer"
                  icon={<Settings className="h-4 w-4" />}
                  error={errors.name}
                />

                <ModernInput
                  label="Website URL"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://www.platform.com"
                  icon={<Globe className="h-4 w-4" />}
                  error={errors.url}
                />

                <ModernInput
                  label="Commission Rate (%)"
                  type="number"
                  step="0.01"
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  placeholder="e.g., 10"
                  icon={<Percent className="h-4 w-4" />}
                  error={errors.commission}
                />
              </div>

              <ModernInput
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the platform"
                icon={<FileText className="h-4 w-4" />}
              />

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1">
                  {editingPlatform ? "Update Platform" : "Add Platform"}
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </ModernButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.length === 0 ? (
            <div className="col-span-full">
              <ModernCard>
                <ModernCardContent className="py-16 text-center">
                  <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No platforms found</h3>
                  <p className="text-gray-500 mb-6">
                    Get started by adding your first freelancing platform
                  </p>
                  <ModernButton onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4" />
                    Add First Platform
                  </ModernButton>
                </ModernCardContent>
              </ModernCard>
            </div>
          ) : (
            platforms.map((platform) => (
              <ModernCard key={platform._id} className="group hover:shadow-xl transition-all duration-300">
                <ModernCardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <ModernCardTitle className="group-hover:text-blue-600 transition-colors">
                          {platform.name}
                        </ModernCardTitle>
                        {platform.commission && (
                          <p className="text-sm text-gray-500 mt-1">
                            {platform.commission}% commission
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </ModernCardHeader>
                
                <ModernCardContent className="space-y-4">
                  {platform.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {platform.description}
                    </p>
                  )}

                  {platform.url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm hover:underline truncate"
                      >
                        {platform.url.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(platform)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(platform._id, platform.name)}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </ModernButton>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))
          )}
        </div>
      </div>
    </ModernMainLayout>
  )
}