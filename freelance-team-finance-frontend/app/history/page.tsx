"use client"

import { useEffect, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"
import { 
  Search, 
  Clock, 
  User, 
  History as HistoryIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Activity,
  FileText,
  Database
} from "lucide-react"

interface HistoryEntry {
  _id: string
  action: string
  entity: string
  entityId: string | null
  description: string
  changes?: any
  user: {
    name: string
    email: string
  }
  timestamp: string
}

export default function ModernHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const data = await apiClient.getHistory()
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch history:", error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter((entry) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || 
                         entry.action.toLowerCase().includes(searchLower) ||
                         entry.entity.toLowerCase().includes(searchLower) ||
                         entry.description.toLowerCase().includes(searchLower) ||
                         entry.user.name.toLowerCase().includes(searchLower) ||
                         entry.user.email.toLowerCase().includes(searchLower)
    const matchesAction = !actionFilter || entry.action === actionFilter
    const matchesEntity = !entityFilter || entry.entity.toLowerCase() === entityFilter.toLowerCase()
    return matchesSearch && matchesAction && matchesEntity
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "success"
      case "update": return "info"
      case "delete": return "danger"
      case "login": return "secondary"
      default: return "secondary"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return <Plus className="h-4 w-4" />
      case "update": return <Edit className="h-4 w-4" />
      case "delete": return <Trash2 className="h-4 w-4" />
      case "login": return <User className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "project": return <FileText className="h-4 w-4" />
      case "account": return <Database className="h-4 w-4" />
      case "expense": return <FileText className="h-4 w-4" />
      case "lead": return <FileText className="h-4 w-4" />
      case "payment": return <FileText className="h-4 w-4" />
      case "hourlywork": return <Clock className="h-4 w-4" />
      case "category": return <Database className="h-4 w-4" />
      case "platform": return <Database className="h-4 w-4" />
      case "user": return <User className="h-4 w-4" />
      case "login": return <User className="h-4 w-4" />
      default: return <Database className="h-4 w-4" />
    }
  }

  // Statistics
  const totalActions = history.length
  const todayActions = history.filter(h => 
    new Date(h.timestamp).toDateString() === new Date().toDateString()
  ).length
  const uniqueUsers = new Set(history.map(h => h.user.email)).size

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity History</h1>
            <p className="text-gray-600 text-lg">
              Comprehensive audit log of all system changes and activities
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Actions</ModernCardTitle>
                  <p className="text-white/80 text-sm">All time</p>
                </div>
                <Activity className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{totalActions}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Today's Activity</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Actions today</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{todayActions}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Active Users</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Unique contributors</p>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{uniqueUsers}</div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModernInput
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
              <ModernSelect
                label="Filter by Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                options={[
                  { value: "", label: "All Actions" },
                  { value: "create", label: "Create" },
                  { value: "update", label: "Update" },
                  { value: "delete", label: "Delete" },
                  { value: "login", label: "Login" }
                ]}
              />
              <ModernSelect
                label="Filter by Entity"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                options={[
                  { value: "", label: "All Entities" },
                  { value: "project", label: "Projects" },
                  { value: "expense", label: "Expenses" },
                  { value: "account", label: "Accounts" },
                  { value: "lead", label: "Leads" },
                  { value: "payment", label: "Payments" },
                  { value: "hourlywork", label: "Hourly Work" },
                  { value: "category", label: "Categories" },
                  { value: "platform", label: "Platforms" },
                  { value: "user", label: "Users" },
                  { value: "login", label: "Logins" }
                ]}
              />
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Activity Timeline */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">Activity Timeline</ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredHistory.length} of {history.length}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No history entries found</p>
                <p className="text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                  {filteredHistory.map((entry, index) => (
                    <div 
                      key={entry._id} 
                      className={`
                        relative border-l-4 pl-6 pb-6
                        ${index < filteredHistory.length - 1 ? 'border-b border-gray-200' : ''}
                        ${entry.action === 'create' ? 'border-l-green-500' : ''}
                        ${entry.action === 'update' ? 'border-l-blue-500' : ''}
                        ${entry.action === 'delete' ? 'border-l-red-500' : ''}
                        ${entry.action === 'login' ? 'border-l-purple-500' : ''}
                        ${!['create', 'update', 'delete', 'login'].includes(entry.action) ? 'border-l-gray-400' : ''}
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                          {getActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <ModernBadge variant={getActionColor(entry.action)}>
                              {entry.action.toUpperCase()}
                            </ModernBadge>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getEntityIcon(entry.entity)}
                              <span className="font-medium capitalize">{entry.entity}</span>
                            </div>
                          </div>

                          <p className="text-gray-800 font-medium mb-3 leading-relaxed">{entry.description}</p>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{entry.user.name}</span>
                              <span className="text-gray-400">({entry.user.email})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatDateTimeDDMMYYYY(entry.timestamp)}</span>
                            </div>
                          </div>

                          {entry.changes && Object.keys(entry.changes).length > 0 && (
                            <details className="group/details">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2">
                                <Eye className="h-3 w-3" />
                                View Changes
                                <span className="text-xs text-gray-400 ml-1">
                                  ({Object.keys(entry.changes).length} fields changed)
                                </span>
                              </summary>
                              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="space-y-2">
                                  {Object.entries(entry.changes).map(([key, change]: [string, any]) => (
                                    <div key={key} className="text-xs py-1 border-b border-gray-100 last:border-0">
                                      <span className="font-semibold text-gray-700 capitalize">{key}:</span>
                                      {'old' in change && (
                                        <span className="text-red-600 ml-2">"{String(change.old)}"</span>
                                      )}
                                      {'old' in change && 'new' in change && (
                                        <span className="mx-2 text-gray-400">→</span>
                                      )}
                                      {'new' in change && (
                                        <span className="text-green-600">"{String(change.new)}"</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}