"use client"

import { useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { 
  FileText, 
  Table, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Receipt,
  FolderOpen,
  CreditCard,
  Database,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { apiClient } from "@/lib/api"

interface ReportCategory {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  endpoint: string
}

export default function ModernReportsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const downloadReport = async (format: string, category: ReportCategory) => {
    const reportKey = `${category.id}-${format}`
    setLoading(reportKey)
    setError(null)
    setSuccess(null)
    
    try {
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append("startDate", dateRange.startDate)
      if (dateRange.endDate) params.append("endDate", dateRange.endDate)
      params.append("scope", "me") // Always use user scope

      const endpoint = `/api/comprehensive-reports/${category.endpoint}/${format}`
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}?${params.toString()}`
      
      const token = localStorage.getItem("token")
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate report' }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const urlObj = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = urlObj
      
      const contentType = response.headers.get("content-type") || ""
      let extension = format
      if (contentType.includes("spreadsheet")) extension = "xlsx"
      else if (contentType.includes("pdf")) extension = "pdf"
      else if (contentType.includes("csv")) extension = "csv"
      
      a.download = `${category.id}-report-${new Date().toISOString().split("T")[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(urlObj)
      document.body.removeChild(a)
      
      setSuccess(`${category.title} report downloaded successfully!`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (error: any) {
      console.error("Failed to download report:", error)
      setError(error.message || "Failed to download report. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  const reportCategories: ReportCategory[] = [
    {
      id: "income",
      title: "Income Reports",
      description: "Payment history, income tracking, and financial summaries",
      icon: <DollarSign className="h-8 w-8 text-green-500" />,
      color: "from-green-500 to-emerald-500",
      endpoint: "income"
    },
    {
      id: "expense",
      title: "Expense Reports",
      description: "Detailed breakdown of all business and personal expenses",
      icon: <Receipt className="h-8 w-8 text-red-500" />,
      color: "from-red-500 to-pink-500",
      endpoint: "expense"
    },
    {
      id: "project",
      title: "Project Reports",
      description: "Comprehensive project performance and timeline analysis",
      icon: <FolderOpen className="h-8 w-8 text-blue-500" />,
      color: "from-blue-500 to-indigo-500",
      endpoint: "project"
    },
    {
      id: "account",
      title: "Account Reports",
      description: "Account balances, transactions, and financial statements",
      icon: <Database className="h-8 w-8 text-purple-500" />,
      color: "from-purple-500 to-violet-500",
      endpoint: "account"
    },
    {
      id: "profit-loss",
      title: "Profit & Loss",
      description: "Complete financial overview with income, expenses, and net profit",
      icon: <TrendingUp className="h-8 w-8 text-orange-500" />,
      color: "from-orange-500 to-amber-500",
      endpoint: "profit-loss"
    }
  ]

  const formatOptions = [
    {
      format: "csv",
      label: "CSV",
      description: "Comma-separated values",
      icon: <Table className="h-5 w-5" />,
      color: "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
    },
    {
      format: "excel",
      label: "Excel",
      description: "Microsoft Excel format",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      color: "bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
    },
    {
      format: "pdf",
      label: "PDF",
      description: "Professional PDF report",
      icon: <FileText className="h-5 w-5" />,
      color: "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
    }
  ]

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-gray-600 text-lg">
              Export comprehensive reports and analyze your business performance
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Report Types</ModernCardTitle>
                  <p className="text-white/80 text-sm">Available categories</p>
                </div>
                <BarChart3 className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{reportCategories.length}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Export Formats</ModernCardTitle>
                  <p className="text-gray-600 text-sm">CSV, Excel, PDF</p>
                </div>
                <Download className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{formatOptions.length}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Date Filtering</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Custom ranges</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">✓</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Real-time Data</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Live updates</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">✓</div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Date Range Filter */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle>Filter Options</ModernCardTitle>
            <p className="text-sm text-gray-600 mt-1">Select date range to filter reports (optional)</p>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernInput
                label="Start Date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                icon={<Calendar className="h-4 w-4" />}
              />
              <ModernInput
                label="End Date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="mt-4">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ startDate: "", endDate: "" })}
                >
                  Clear Filters
                </ModernButton>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Report Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportCategories.map((category) => (
            <ModernCard key={category.id} className="group hover:shadow-xl transition-all duration-300">
              <ModernCardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center shadow-lg`}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <ModernCardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {category.title}
                    </ModernCardTitle>
                    <p className="text-gray-600 mt-1 text-sm">{category.description}</p>
                  </div>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="grid grid-cols-3 gap-3">
                  {formatOptions.map((format) => {
                    const isLoading = loading === `${category.id}-${format.format}`
                    return (
                      <ModernButton
                        key={format.format}
                        variant="outline"
                        onClick={() => downloadReport(format.format, category)}
                        disabled={isLoading || !!loading}
                        className={`flex flex-col items-center gap-2 h-auto py-4 transition-all ${format.color} ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                        ) : (
                          format.icon
                        )}
                        <div className="text-center">
                          <div className="font-semibold text-sm">{format.label}</div>
                          <div className="text-xs mt-1 opacity-75 line-clamp-1">
                            {format.description}
                          </div>
                        </div>
                      </ModernButton>
                    )
                  })}
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>

        {/* Info Card */}
        <ModernCard>
          <ModernCardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About Reports</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  All reports are generated based on your data and filtered by the selected date range. 
                  Reports include comprehensive details with proper formatting for easy analysis. 
                  CSV files are perfect for spreadsheet analysis, Excel files include advanced formatting, 
                  and PDF files are ideal for presentations and record-keeping.
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}
