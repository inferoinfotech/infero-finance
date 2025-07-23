"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { Plus, Edit, Trash2, Globe } from "lucide-react"

interface Platform {
  _id: string
  name: string
  url?: string
  description?: string
  commission?: number
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    commission: "",
  })

  useEffect(() => {
    fetchPlatforms()
  }, [])

const fetchPlatforms = async () => {
  try {
    const data = await apiClient.getPlatforms()
    console.log("Fetched platforms data:", data)
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const platformData = {
        ...formData,
        commission: formData.commission ? Number(formData.commission) : undefined,
      }
      await apiClient.createPlatform(platformData)
      setShowAddForm(false)
      setFormData({
        name: "",
        url: "",
        description: "",
        commission: "",
      })
      fetchPlatforms()
    } catch (error) {
      console.error("Failed to create platform:", error)
    }
  }

  const handleDelete = async (platformId: string) => {
    if (confirm("Are you sure you want to delete this platform?")) {
      try {
        await apiClient.request(`/api/platforms/${platformId}`, { method: "DELETE" })
        setPlatforms(platforms.filter((p) => p._id !== platformId))
      } catch (error) {
        console.error("Failed to delete platform:", error)
      }
    }
  }

  if (loading) {
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platforms</h1>
            <p className="text-gray-600">Manage freelancing platforms</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Platform
          </Button>
        </div>

        {/* Add Platform Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Upwork, Fiverr, Freelancer"
                    />
                  </div>

                  {/* <div className="space-y-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://www.platform.com"
                    />
                  </div> */}

                  {/* <div className="space-y-2">
                    <label className="text-sm font-medium">Commission (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div> */}
                </div>

                {/* <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the platform"
                  />
                </div> */}

                <div className="flex gap-4">
                  <Button type="submit">Add Platform</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Platforms List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card key={platform._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {platform.url && (
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>URL:</strong>{" "}
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {platform.url}
                        </a>
                      </p>
                    </div>
                  )}
                  {platform.commission && (
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Commission:</strong> {platform.commission}%
                      </p>
                    </div>
                  )}
                  {platform.description && (
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Description:</strong> {platform.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(platform._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {platforms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No platforms found</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
