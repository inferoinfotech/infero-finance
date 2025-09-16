"use client"

import { useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { 
  FileText, 
  Table, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Receipt,
  FolderOpen,
  CreditCard,
  Database
} from "lucide-react"

export default function ModernReportsPage() {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  })

  const downloadReport = async (format: string, type: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append("startDate", dateRange.startDate)
      if (dateRange.endDate) params.append("endDate", dateRange.endDate)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/${type}-reports/${format}?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}-report-${new Date().toISOString().split("T")[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Failed to download report:", error)
    } finally {
      setLoading(false)
    }
  }

  const reportCategories = [
    {
      title: "Expense Reports",
      description: "Detailed breakdown of all business and personal expenses",
      icon: <Receipt className="h-8 w-8 text-red-500" />,
      type: "expense",
      color: "from-red-500 to-pink-500"
    },
    {
      title: "Project Reports",
      description: "Comprehensive project performance and timeline analysis",
      icon: <FolderOpen className="h-8 w-8 text-blue-500" />,
      type: "project",
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "Payment Reports",
      description: "Payment history, status tracking, and financial summaries",
      icon: <CreditCard className="h-8 w-8 text-green-500" />,
      type: "payment",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Account Reports",
      description: "Account balances, transactions, and financial statements",
      icon: <Database className="h-8 w-8 text-purple-500" />,
      type: "account",
      color: "from-purple-500 to-violet-500"
    }
  ]

  const formatOptions = [
    {
      format: "csv",
      label: "CSV",
      description: "Comma-separated values for spreadsheet analysis",
      icon: <Table className="h-5 w-5" />
    },
    {
      format: "excel",
      label: "Excel",
      description: "Microsoft Excel format with advanced formatting",
      icon: <FileSpreadsheet className="h-5 w-5" />
    },
    {
      format: "pdf",
      label: "PDF",
      description: "Professional PDF report for presentations",
      icon: <FileText className="h-5 w-5" />
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Report Types</ModernCardTitle>
                  <p className="text-white/80 text-sm">Available formats</p>
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
          </ModernCardContent>
        </ModernCard>

        {/* Report Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {reportCategories.map((category) => (
            <ModernCard key={category.type} className="group hover:shadow-xl transition-all duration-300">
              <ModernCardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                    {category.icon}
                  </div>
                  <div>
                    <ModernCardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {category.title}
                    </ModernCardTitle>
                    <p className="text-gray-600 mt-1">{category.description}</p>
                  </div>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {formatOptions.map((format) => (
                    <ModernButton
                      key={format.format}
                      variant="outline"
                      onClick={() => downloadReport(format.format, category.type)}
                      disabled={loading}
                      className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-gray-50"
                    >
                      {format.icon}
                      <div className="text-center">
                        <div className="font-semibold">{format.label}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {format.description}
                        </div>
                      </div>
                    </ModernButton>
                  ))}
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <ModernCard>
            <ModernCardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <div className="text-blue-600 font-medium text-lg">Generating Report...</div>
              <p className="text-gray-500 mt-2">Please wait while we prepare your download</p>
            </ModernCardContent>
          </ModernCard>
        )}
      </div>
    </ModernMainLayout>
  )
}