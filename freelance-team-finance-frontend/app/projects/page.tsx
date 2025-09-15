"use client"

import { useEffect, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  DollarSign,
  Clock,
  Users,
  Briefcase,
  Filter,
  TrendingUp
} from "lucide-react"

interface Project {
  _id: string
  name: string
  clientName: string
  platform: any
  currency: string
  status: string
  startDate: string
  endDate: string
  priceType: string
  fixedPrice?: number
  hourlyRate?: number
  platformCharge: number
  conversionRate: number
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "working", label: "Working" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "extended", label: "Extended" },
]

const priceTypeOptions = [
  { value: "", label: "All Types" },
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
]

export default function ModernProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priceTypeFilter, setPriceTypeFilter] = useState("")

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const data = await apiClient.getProjects()
      if (data && Array.isArray(data.projects)) {
        setProjects(data.projects)
      } else if (Array.isArray(data)) {
        setProjects(data)
      } else {
        setProjects([])
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        await apiClient.deleteProject(projectId)
        setProjects(projects.filter((p) => p._id !== projectId))
      } catch (error) {
        console.error("Failed to delete project:", error)
      }
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || project.status === statusFilter
    const matchesPriceType = !priceTypeFilter || project.priceType === priceTypeFilter
    return matchesSearch && matchesStatus && matchesPriceType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning"
      case "working": return "info"
      case "completed": return "success"
      case "paused": return "secondary"
      case "extended": return "purple"
      default: return "secondary"
    }
  }

  const getPlatformName = (platform: any) => {
    if (typeof platform === "object" && platform !== null) {
      return platform.name
    }
    return platform || "Unknown"
  }

  // Statistics
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === "working" || p.status === "pending").length
  const completedProjects = projects.filter(p => p.status === "completed").length
  const totalValue = projects.reduce((sum, p) => sum + (p.fixedPrice || p.hourlyRate || 0), 0)

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
          <LoadingSkeleton variant="card" height={400} />
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Portfolio</h1>
            <p className="text-gray-600 text-lg">
              Manage and track all your freelancing projects in one place
            </p>
          </div>
          <Link href="/projects/create">
            <ModernButton>
              <Plus className="h-4 w-4" />
              New Project
            </ModernButton>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Projects</ModernCardTitle>
                  <p className="text-white/80 text-sm">All time</p>
                </div>
                <Briefcase className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{totalProjects}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Active Projects</ModernCardTitle>
                  <p className="text-gray-600 text-sm">In progress</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{activeProjects}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Completed</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Finished projects</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{completedProjects}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Project Value</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Total worth</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${totalValue.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <ModernInput
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="lg:w-48">
                <ModernSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                />
              </div>
              <div className="lg:w-48">
                <ModernSelect
                  label="Price Type"
                  value={priceTypeFilter}
                  onChange={(e) => setPriceTypeFilter(e.target.value)}
                  options={priceTypeOptions}
                />
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full">
              <ModernCard>
                <ModernCardContent className="py-16 text-center">
                  <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-500 mb-6">
                    {projects.length === 0 
                      ? "Get started by creating your first project"
                      : "Try adjusting your filters to find what you're looking for"
                    }
                  </p>
                  {projects.length === 0 && (
                    <Link href="/projects/create">
                      <ModernButton>
                        <Plus className="h-4 w-4" />
                        Create First Project
                      </ModernButton>
                    </Link>
                  )}
                </ModernCardContent>
              </ModernCard>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ModernCard key={project._id} className="group hover:shadow-xl transition-all duration-300">
                <ModernCardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <ModernCardTitle className="group-hover:text-blue-600 transition-colors line-clamp-1">
                        {project.name}
                      </ModernCardTitle>
                      <p className="text-gray-600 text-sm mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.clientName}
                      </p>
                    </div>
                    <ModernBadge 
                      variant={getStatusColor(project.status)}
                      className="capitalize shrink-0"
                    >
                      {project.status}
                    </ModernBadge>
                  </div>
                </ModernCardHeader>
                
                <ModernCardContent className="space-y-4">
                  {/* Project Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Platform
                      </p>
                      <p className="font-medium text-gray-900">
                        {getPlatformName(project.platform)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Type
                      </p>
                      <p className="font-medium text-gray-900 capitalize">
                        {project.priceType}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">
                        {project.priceType === "fixed" ? "Total Value" : "Hourly Rate"}
                      </span>
                      <span className="font-bold text-lg text-gray-900">
                        {project.currency} {
                          project.priceType === "fixed" 
                            ? project.fixedPrice?.toLocaleString() || "0"
                            : `${project.hourlyRate || 0}/hr`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="text-sm">
                    <p className="text-gray-500 flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      Timeline
                    </p>
                    <div className="flex items-center justify-between text-gray-900">
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                      <span className="text-gray-400">→</span>
                      <span>
                        {project.endDate 
                          ? new Date(project.endDate).toLocaleDateString()
                          : "Ongoing"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/projects/${project._id}`} className="flex-1">
                      <ModernButton variant="outline" size="sm" className="w-full">
                        <Eye className="h-3 w-3" />
                        View
                      </ModernButton>
                    </Link>
                    <Link href={`/projects/${project._id}/edit`}>
                      <ModernButton variant="outline" size="sm">
                        <Edit className="h-3 w-3" />
                      </ModernButton>
                    </Link>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(project._id, project.name)}
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