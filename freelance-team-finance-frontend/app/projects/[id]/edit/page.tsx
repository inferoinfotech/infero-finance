"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { ArrowLeft, FolderOpen, Users, Globe, DollarSign, Calendar, Save } from "lucide-react"
import Link from "next/link"

interface Platform {
  _id: string
  name: string
}

export default function ModernEditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [formData, setFormData] = useState({
    name: "",
    clientName: "",
    platform: "",
    currency: "USD",
    status: "pending",
    startDate: "",
    endDate: "",
    priceType: "fixed",
    budget: "",
    hourlyRate: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    apiClient.getPlatforms().then((data) => {
      if (Array.isArray(data)) setPlatforms(data)
      else if (data.platforms) setPlatforms(data.platforms)
    })
  }, [])

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      let project = await apiClient.getProject(params.id as string)
      if (project.project) project = project.project

      let platformId = ""
      if (typeof project.platform === "object" && project.platform !== null) {
        platformId = project.platform._id
      } else {
        platformId = project.platform
      }

      setFormData({
        name: project.name || "",
        clientName: project.clientName || "",
        platform: platformId || "",
        currency: project.currency || "USD",
        status: project.status || "pending",
        startDate: project.startDate ? project.startDate.split("T")[0] : "",
        endDate: project.endDate ? project.endDate.split("T")[0] : "",
        priceType: project.priceType || "fixed",
        budget: project.budget?.toString() || project.fixedPrice?.toString() || "",
        hourlyRate: project.hourlyRate?.toString() || "",
      })
    } catch (error) {
      console.error("Failed to fetch project:", error)
      setErrors({ fetch: "Failed to load project details" })
    } finally {
      setFetchLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Project name is required"
    if (!formData.clientName.trim()) newErrors.clientName = "Client name is required"
    if (!formData.platform) newErrors.platform = "Please select a platform"
    if (!formData.startDate) newErrors.startDate = "Start date is required"
    
    if (formData.priceType === "fixed") {
      if (!formData.budget || Number(formData.budget) <= 0) {
        newErrors.budget = "Budget must be greater than 0"
      }
    } else {
      if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
        newErrors.hourlyRate = "Hourly rate must be greater than 0"
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload: any = {
        name: formData.name,
        clientName: formData.clientName,
        platform: formData.platform,
        currency: formData.currency,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        priceType: formData.priceType,
      }
      if (formData.priceType === "fixed") {
        payload.budget = Number(formData.budget)
        payload.fixedPrice = Number(formData.budget)
        payload.hourlyRate = undefined
      } else {
        payload.hourlyRate = Number(formData.hourlyRate)
        payload.budget = undefined
        payload.fixedPrice = undefined
      }
      await apiClient.updateProject(params.id as string, payload)
      router.push(`/projects/${params.id}`)
    } catch (error) {
      console.error("Failed to update project:", error)
      setErrors({ submit: "Failed to update project. Please try again." })
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

  if (fetchLoading) {
    return (
      <ModernMainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <LoadingSkeleton width={100} height={40} />
            <LoadingSkeleton width={300} height={40} />
          </div>
          <LoadingSkeleton variant="card" height={600} />
        </div>
      </ModernMainLayout>
    )
  }

  if (errors.fetch) {
    return (
      <ModernMainLayout>
        <ModernCard>
          <ModernCardContent className="py-16 text-center">
            <div className="text-red-500 text-lg font-medium">Failed to load project</div>
            <p className="text-gray-500 mt-2">Please try refreshing the page</p>
          </ModernCardContent>
        </ModernCard>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <ModernButton variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </ModernButton>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Edit Project</h1>
            <p className="text-gray-600 text-lg">Update project details and configuration</p>
          </div>
        </div>

        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <ModernCardTitle className="text-2xl">Project Details</ModernCardTitle>
                <p className="text-gray-600 mt-1">Update the information below to modify your project</p>
              </div>
            </div>
          </ModernCardHeader>
          
          <ModernCardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModernInput
                    label="Project Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter project name"
                    icon={<FolderOpen className="h-4 w-4" />}
                    error={errors.name}
                  />

                  <ModernInput
                    label="Client Name"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    placeholder="Enter client name"
                    icon={<Users className="h-4 w-4" />}
                    error={errors.clientName}
                  />

                  <ModernSelect
                    label="Platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    options={[
                      { value: "", label: "Select Platform" },
                      ...platforms.map((p) => ({ value: p._id, label: p.name }))
                    ]}
                    error={errors.platform}
                  />

                  <ModernSelect
                    label="Currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    options={[
                      { value: "USD", label: "USD - US Dollar" },
                      { value: "EUR", label: "EUR - Euro" },
                      { value: "GBP", label: "GBP - British Pound" },
                      { value: "INR", label: "INR - Indian Rupee" }
                    ]}
                  />
                </div>
              </div>

              {/* Project Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Project Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModernSelect
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "working", label: "Working" },
                      { value: "completed", label: "Completed" },
                      { value: "extended", label: "Extended" },
                      { value: "paused", label: "Paused" }
                    ]}
                  />

                  <ModernSelect
                    label="Price Type"
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleChange}
                    options={[
                      { value: "fixed", label: "Fixed Price" },
                      { value: "hourly", label: "Hourly Rate" }
                    ]}
                  />

                  <ModernInput
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    icon={<Calendar className="h-4 w-4" />}
                    error={errors.startDate}
                  />

                  <ModernInput
                    label="End Date"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Pricing Details
                </h3>
                {formData.priceType === "fixed" ? (
                  <ModernInput
                    label="Total Budget"
                    name="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="e.g., 10000"
                    icon={<DollarSign className="h-4 w-4" />}
                    error={errors.budget}
                  />
                ) : (
                  <ModernInput
                    label="Hourly Rate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    placeholder="Enter hourly rate"
                    icon={<DollarSign className="h-4 w-4" />}
                    error={errors.hourlyRate}
                  />
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <ModernButton type="submit" loading={loading} className="flex-1">
                  <Save className="h-4 w-4" />
                  Update Project
                </ModernButton>
                <Link href={`/projects/${params.id}`} className="flex-1">
                  <ModernButton type="button" variant="outline" className="w-full">
                    Cancel
                  </ModernButton>
                </Link>
              </div>
            </form>
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}