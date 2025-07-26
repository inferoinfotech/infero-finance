"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [platforms, setPlatforms] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    clientName: "",
    platform: "",
    currency: "USD",
    status: "pending",
    startDate: "",
    endDate: "",
    priceType: "fixed",
    hourlyRate: "",
    budget: "", // For fixed price only!
  })

  useEffect(() => {
    async function fetchPlatforms() {
      try {
        const data = await apiClient.getPlatforms()
        setPlatforms(Array.isArray(data) ? data : (data.platforms || []))
      } catch {
        setPlatforms([])
      }
    }
    fetchPlatforms()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        ...formData,
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
      await apiClient.createProject(payload)
      router.push("/projects")
    } catch (error) {
      console.error("Failed to create project:", error)
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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Project</h1>
            <p className="text-gray-600">Add a new project to your portfolio</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name, Client Name, Platform, Currency, Status, Start, End */}
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
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((plat: any) => (
                      <option key={plat._id} value={plat._id}>
                        {plat.name}
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
                  <Input name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
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
                  {loading ? "Creating..." : "Create Project"}
                </Button>
                <Link href="/projects" className="flex-1">
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
