"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { Search, Clock, User } from "lucide-react"

interface HistoryEntry {
  _id: string
  action: string
  entity: string
  entityId: string
  changes: any
  user: {
    name: string
    email: string
  }
  timestamp: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const data = await apiClient.getHistory()
      setHistory(data)
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    return matchesSearch && matchesAction
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      case "delete":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return "+"
      case "update":
        return "✏️"
      case "delete":
        return "🗑️"
      default:
        return "📝"
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">History</h1>
          <p className="text-gray-600">Audit log of all changes made to the system</p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        {/* History Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No history entries found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((entry) => (
                  <div key={entry._id} className="border-l-4 border-blue-200 pl-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionColor(entry.action)}>
                            {getActionIcon(entry.action)} {entry.action}
                          </Badge>
                          <span className="font-medium capitalize">{entry.entity}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{entry.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="mt-2">
                            <details className="text-sm">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                View Changes
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                <pre className="text-xs overflow-x-auto">{JSON.stringify(entry.changes, null, 2)}</pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
