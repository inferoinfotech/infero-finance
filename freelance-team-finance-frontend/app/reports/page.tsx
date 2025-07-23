"use client"

import { useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Table, FileSpreadsheet } from "lucide-react"

export default function ReportsPage() {
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Export and download various reports</p>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => downloadReport("csv", "expense")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Table className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                onClick={() => downloadReport("excel", "expense")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => downloadReport("pdf", "expense")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Project Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Project Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => downloadReport("csv", "project")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Table className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                onClick={() => downloadReport("excel", "project")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => downloadReport("pdf", "project")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => downloadReport("csv", "payment")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Table className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                onClick={() => downloadReport("excel", "payment")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => downloadReport("pdf", "payment")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Account Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => downloadReport("csv", "account")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Table className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                onClick={() => downloadReport("excel", "account")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => downloadReport("pdf", "account")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Generating report...</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
