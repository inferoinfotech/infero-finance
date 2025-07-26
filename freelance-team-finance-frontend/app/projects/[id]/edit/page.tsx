"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Platform {
  _id: string
  name: string
}

export default function EditProjectPage() {
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
    budget: "",      // Only for fixed price
    hourlyRate: "",  // Only for hourly
  })

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
    // eslint-disable-next-line
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
        budget: project.budget?.toString() || "",
        hourlyRate: project.hourlyRate?.toString() || "",
      })
    } catch (error) {
      console.error("Failed to fetch project:", error)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        payload.fixedPrice = Number(formData.budget) // Backend expects both
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
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (fetchLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Project</h1>
            <p className="text-gray-600">Update project details</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Name *</label>
                  <Input
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    required
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform *</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency *</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="working">Working</option>
                    <option value="extended">Extended</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price Type *</label>
                  <select
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date *</label>
                  <Input name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date </label>
                  <Input name="endDate" type="date" value={formData.endDate} onChange={handleChange}  />
                </div>
              </div>
              {/* Show fields based on project type */}
              {formData.priceType === "fixed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Budget *</label>
                  <Input
                    name="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 10000"
                  />
                  <span className="text-xs text-gray-500">Total amount in selected currency</span>
                </div>
              )}
              {formData.priceType === "hourly" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hourly Rate *</label>
                  <Input
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    required
                    placeholder="Enter hourly rate"
                  />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Updating..." : "Update Project"}
                </Button>
                <Link href={`/projects/${params.id}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
