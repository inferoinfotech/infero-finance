"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"
import { 
  ArrowLeft,
  Search,
  Filter,
  Download,
  CreditCard,
  Wallet,
  TrendingUp,
  Calendar,
  X,
  FileText,
  FileSpreadsheet,
  Table
} from "lucide-react"

interface Account {
  _id: string
  name: string
  type: string
  balance?: number
}

interface StatementTxn {
  _id: string
  type: "debit" | "credit"
  amount: number
  delta: number
  balanceAfter: number
  refType?: string
  refId?: string
  remark?: string
  createdAt: string
}

interface AccountStatement {
  account: Account
  txns: StatementTxn[]
  total?: number
  limit?: number
  skip?: number
}

export default function AccountStatementPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string

  const [loading, setLoading] = useState(true)
  const [statement, setStatement] = useState<AccountStatement | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (accountId) {
      fetchStatement()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, typeFilter, startDate, endDate, searchTerm])

  const fetchStatement = async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      if (typeFilter) queryParams.set('type', typeFilter)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)
      if (searchTerm) queryParams.set('search', searchTerm)
      queryParams.set('limit', '500') // Get more transactions for detail view

      const data = await apiClient.request(`/api/accounts/${accountId}/statement?${queryParams.toString()}`)
      setStatement(data)
    } catch (err: any) {
      console.error("Failed to fetch statement:", err)
      setError(err.message || "Failed to load account statement")
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setTypeFilter("")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
  }

  const handleDownload = async (format: 'csv' | 'excel' | 'pdf') => {
    setDownloading(format)
    try {
      const queryParams = new URLSearchParams()
      if (typeFilter) queryParams.set('type', typeFilter)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)
      if (searchTerm) queryParams.set('search', searchTerm)

      const token = localStorage.getItem("token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      
      const response = await fetch(
        `${apiUrl}/api/accounts/${accountId}/statement/export/${format}?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        
        const accountName = statement?.account.name.replace(/\s+/g, '-') || 'account'
        const dateStr = new Date().toISOString().split('T')[0]
        const ext = format === 'excel' ? 'xlsx' : format
        a.download = `account-statement-${accountName}-${dateStr}.${ext}`
        
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(error.error || `Failed to download ${format.toUpperCase()} file`)
      }
    } catch (error) {
      console.error(`Failed to download ${format}:`, error)
      alert(`Failed to download ${format.toUpperCase()} file. Please try again.`)
    } finally {
      setDownloading(null)
    }
  }

  const hasActiveFilters = typeFilter || startDate || endDate || searchTerm

  const filteredTxns = statement?.txns || []

  // Calculate totals
  const totalCredits = filteredTxns
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0)
  const totalDebits = filteredTxns
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0)
  const netAmount = totalCredits - totalDebits

  if (loading && !statement) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <LoadingSkeleton width={300} height={40} />
          <LoadingSkeleton variant="card" height={200} />
          <LoadingSkeleton variant="card" height={400} />
        </div>
      </ModernMainLayout>
    )
  }

  if (error && !statement) {
    return (
      <ModernMainLayout>
        <ModernCard>
          <ModernCardContent className="py-16 text-center">
            <div className="text-red-500 text-lg font-medium mb-2">{error}</div>
            <ModernButton onClick={() => router.push("/accounts")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </ModernButton>
          </ModernCardContent>
        </ModernCard>
      </ModernMainLayout>
    )
  }

  if (!statement) {
    return (
      <ModernMainLayout>
        <ModernCard>
          <ModernCardContent className="py-16 text-center">
            <p className="text-gray-500 text-lg">Account not found</p>
            <ModernButton onClick={() => router.push("/accounts")} variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </ModernButton>
          </ModernCardContent>
        </ModernCard>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ModernButton variant="outline" onClick={() => router.push("/accounts")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </ModernButton>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Account Statement</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600 text-lg">{statement.account.name}</p>
                <ModernBadge 
                  variant={statement.account.type === "bank" ? "default" : "success"}
                  className="capitalize"
                >
                  {statement.account.type}
                </ModernBadge>
              </div>
            </div>
          </div>
          
          {/* Download Buttons */}
          <div className="flex items-center gap-2">
            <ModernButton
              variant="outline"
              onClick={() => handleDownload('csv')}
              disabled={downloading !== null || !statement}
              title="Download as CSV"
            >
              {downloading === 'csv' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <Table className="h-4 w-4 mr-1" />
              )}
              CSV
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={() => handleDownload('excel')}
              disabled={downloading !== null || !statement}
              title="Download as Excel"
            >
              {downloading === 'excel' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-1" />
              )}
              Excel
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null || !statement}
              title="Download as PDF"
            >
              {downloading === 'pdf' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <FileText className="h-4 w-4 mr-1" />
              )}
              PDF
            </ModernButton>
          </div>
        </div>

        {/* Account Summary */}
        <ModernCard variant="gradient">
          <ModernCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Current Balance</p>
                <div className="text-4xl font-bold text-white">
                  ₹{(statement.account.balance || 0).toLocaleString()}
                </div>
              </div>
              {statement.account.type === "bank" ? (
                <CreditCard className="h-12 w-12 text-white/80" />
              ) : (
                <Wallet className="h-12 w-12 text-white/80" />
              )}
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Filters */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </ModernCardTitle>
              {hasActiveFilters && (
                <ModernButton variant="outline" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </ModernButton>
              )}
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModernInput
                label="Search Remarks"
                placeholder="Search in remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
              
              <ModernSelect
                label="Transaction Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "All Types" },
                  { value: "credit", label: "Credit" },
                  { value: "debit", label: "Debit" }
                ]}
              />

              <ModernInput
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />

              <ModernInput
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Summary Stats */}
        {hasActiveFilters && filteredTxns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModernCard>
              <ModernCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <ModernCardTitle className="text-lg">Total Credits</ModernCardTitle>
                    <p className="text-gray-600 text-sm">Filtered results</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="text-2xl font-bold text-green-600">
                  +₹{totalCredits.toLocaleString()}
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <ModernCardTitle className="text-lg">Total Debits</ModernCardTitle>
                    <p className="text-gray-600 text-sm">Filtered results</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-500 rotate-180" />
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="text-2xl font-bold text-red-600">
                  -₹{totalDebits.toLocaleString()}
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <ModernCardTitle className="text-lg">Net Amount</ModernCardTitle>
                    <p className="text-gray-600 text-sm">Filtered results</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className={`text-2xl font-bold ${netAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {netAmount >= 0 ? "+" : ""}₹{netAmount.toLocaleString()}
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {/* Transactions Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">Transactions</ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredTxns.length} {filteredTxns.length === 1 ? "transaction" : "transactions"}
                {statement.total && statement.total > filteredTxns.length && (
                  <span className="ml-1">(showing {filteredTxns.length} of {statement.total})</span>
                )}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredTxns.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No transactions found</p>
                <p className="text-gray-400">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "This account has no transaction history yet"}
                </p>
                {hasActiveFilters && (
                  <ModernButton variant="outline" onClick={handleClearFilters} className="mt-4">
                    Clear Filters
                  </ModernButton>
                )}
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Date & Time</ModernTableHead>
                    <ModernTableHead>Type</ModernTableHead>
                    <ModernTableHead>Amount</ModernTableHead>
                    <ModernTableHead>Balance After</ModernTableHead>
                    <ModernTableHead>Reference</ModernTableHead>
                    <ModernTableHead>Remark</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {filteredTxns.map((txn) => (
                    <ModernTableRow key={txn._id}>
                      <ModernTableCell>
                        <div className="text-sm font-medium">
                          {formatDateTimeDDMMYYYY(txn.createdAt)}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge
                          variant={txn.type === "credit" ? "success" : "warning"}
                          className="capitalize"
                        >
                          {txn.type}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className={`font-semibold text-lg ${
                          txn.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}>
                          {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="font-medium text-gray-900">
                          ₹{txn.balanceAfter.toLocaleString()}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-sm text-gray-600">
                          {txn.refType ? (
                            <ModernBadge variant="secondary" className="capitalize">
                              {txn.refType}
                            </ModernBadge>
                          ) : (
                            "—"
                          )}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="max-w-xs text-sm text-gray-600">
                          {txn.remark || "—"}
                        </div>
                      </ModernTableCell>
                    </ModernTableRow>
                  ))}
                </ModernTableBody>
              </ModernTable>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}

