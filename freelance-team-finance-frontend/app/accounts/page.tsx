"use client"

import { useEffect, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditAccountModal } from "@/components/accounts/edit-account-modal"
import { apiClient } from "@/lib/api"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"
import { 
  Plus, 
  Edit, 
  Trash2, 
  CreditCard, 
  Wallet, 
  DollarSign,
  Search,
  Eye,
  TrendingUp,
  Building2,
  ExternalLink,
  Download,
  FileText,
  FileSpreadsheet,
  Table,
  ArrowRightLeft
} from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

interface Account {
  _id: string
  type: string
  name: string
  details: string
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
  account: {
    _id: string
    name: string
    type: string
    balance?: number
  }
  txns: StatementTxn[]
}

const accountTypeOptions = [
  { value: "bank", label: "Bank Account" },
  { value: "wallet", label: "Digital Wallet" }
]

export default function ModernAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"wallet" | "bank">("wallet")
  const [formData, setFormData] = useState({
    type: "bank",
    name: "",
    details: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statementOpen, setStatementOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferFormData, setTransferFormData] = useState({
    walletId: "",
    bankId: "",
    amount: "",
    conversionRate: "",
  })
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({})

  const {
    data: statement,
    error: statementError,
    isLoading: statementLoading,
  } = useSWR<AccountStatement>(
    statementOpen && selectedAccount ? `/api/accounts/${selectedAccount._id}/statement` : null,
    () => apiClient.getAccountStatement(selectedAccount!._id),
  )

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts()
      if (Array.isArray(data)) {
        setAccounts(data)
      } else if (data && Array.isArray(data.accounts)) {
        setAccounts(data.accounts)
      } else {
        setAccounts([])
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Account name is required"
    if (!formData.details.trim()) newErrors.details = "Account details are required"
    if (!formData.type) newErrors.type = "Account type is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await apiClient.createAccount({
        ...formData,
        name: formData.name.trim(),
        details: formData.details.trim(),
      })
      setShowAddForm(false)
      setFormData({ type: activeTab, name: "", details: "" })
      setErrors({})
      fetchAccounts()
    } catch (error) {
      console.error("Failed to create account:", error)
      setErrors({ submit: "Failed to create account. Please try again." })
    }
  }

  const handleDelete = async (accountId: string, accountName: string) => {
    if (window.confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)) {
      try {
        await apiClient.request(`/api/accounts/${accountId}`, { method: "DELETE" })
        setAccounts(accounts.filter((a) => a._id !== accountId))
      } catch (error) {
        console.error("Failed to delete account:", error)
      }
    }
  }

  const handleOpenStatement = (account: Account) => {
    setSelectedAccount(account)
    setStatementOpen(true)
  }

  const handleCloseStatement = () => {
    setStatementOpen(false)
    setSelectedAccount(null)
  }

  const handleDownloadFromModal = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!selectedAccount) return
    
    setDownloading(format)
    try {
      const token = localStorage.getItem("token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      
      const response = await fetch(
        `${apiUrl}/api/accounts/${selectedAccount._id}/statement/export/${format}`,
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
        
        const accountName = selectedAccount.name.replace(/\s+/g, '-')
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

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setShowEditModal(true)
  }

  const handleEditSuccess = () => {
    fetchAccounts()
    setShowEditModal(false)
    setEditingAccount(null)
  }

  // Filter accounts by active tab and search
  const filteredAccounts = accounts.filter((account) => {
    const matchesTab = account.type === activeTab
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.details.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  const bankBalance = accounts.filter(a => a.type === "bank").reduce((sum, a) => sum + (a.balance || 0), 0)
  const walletBalance = accounts.filter(a => a.type === "wallet").reduce((sum, a) => sum + (a.balance || 0), 0)
  const activeTabBalance = activeTab === "bank" ? bankBalance : walletBalance

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Account Management</h1>
            <p className="text-gray-600 text-lg">
              Manage your bank accounts and digital wallets in one place
            </p>
          </div>
          <div className="flex gap-3">
            <ModernButton 
              variant="outline"
              onClick={() => {
                setTransferFormData({
                  walletId: "",
                  bankId: "",
                  amount: "",
                  conversionRate: "",
                })
                setTransferErrors({})
                setShowTransferModal(true)
              }}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer Money
            </ModernButton>
          <ModernButton onClick={() => {
            setFormData({ type: activeTab, name: "", details: "" })
            setShowAddForm(true)
          }}>
            <Plus className="h-4 w-4" />
            Add Account
          </ModernButton>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Balance</ModernCardTitle>
                  <p className="text-white/80 text-sm">All accounts</p>
                </div>
                <DollarSign className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">
                ₹{totalBalance.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Bank Balance</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Bank accounts</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{bankBalance.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Wallet Balance</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Digital wallets</p>
                </div>
                <Wallet className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{walletBalance.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Total Accounts</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Active accounts</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                {accounts.length}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Tabs and Search */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Tabs */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("wallet")}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "wallet"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("bank")}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "bank"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Bank
                  </div>
                </button>
              </div>

              {/* Search */}
              <div className="flex-1 lg:max-w-md">
                <ModernInput
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Add Account Modal */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Account</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernSelect
                  label="Account Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  options={accountTypeOptions}
                  error={errors.type}
                />

                <ModernInput
                  label="Account Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., HDFC Savings, PayPal"
                  error={errors.name}
                />
              </div>

              <ModernInput
                label="Account Details"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Account number, email, or other identifying details"
                error={errors.details}
              />

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1">
                  Add Account
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ type: activeTab, name: "", details: "" })
                    setErrors({})
                  }}
                  className="flex-1"
                >
                  Cancel
                </ModernButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Accounts Cards */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl capitalize">
                {activeTab === "wallet" ? "Digital Wallets" : "Bank Accounts"}
              </ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredAccounts.length} {filteredAccounts.length === 1 ? "account" : "accounts"}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                {activeTab === "wallet" ? (
                  <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                ) : (
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                )}
                <p className="text-gray-500 text-lg">No {activeTab} accounts found</p>
                <p className="text-gray-400">Try adjusting your search or add a new account</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <ModernCard key={account._id} className="hover:shadow-lg transition-shadow">
                    <ModernCardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {account.type === "bank" ? (
                              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <CreditCard className="h-6 w-6 text-blue-600" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-green-600" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">{account.name}</h3>
                              <ModernBadge 
                                variant={account.type === "bank" ? "default" : "success"}
                                className="capitalize mt-1"
                              >
                                {account.type}
                              </ModernBadge>
                            </div>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                          <div className="text-2xl font-bold text-gray-900">
                            ₹{(account.balance || 0).toLocaleString()}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="pt-2">
                          <p className="text-sm text-gray-600 mb-1">Details</p>
                          <p className="text-sm text-gray-900 line-clamp-2">{account.details}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatement(account)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(account._id, account.name)}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ModernButton>
                        </div>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                ))}
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Account Statement Modal */}
        <Dialog open={statementOpen} onOpenChange={(open) => (open ? setStatementOpen(true) : handleCloseStatement())}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {selectedAccount ? `Statement — ${selectedAccount.name}` : "Account Statement"}
              </DialogTitle>
              <p className="text-gray-600">View recent transactions and running balance</p>
            </DialogHeader>

            {statementLoading && (
              <div className="py-8">
                <LoadingSkeleton lines={5} />
              </div>
            )}

            {statementError && (
              <div className="py-8 text-center">
                <div className="text-red-500 text-lg font-medium">Failed to load statement</div>
                <p className="text-gray-500 mt-2">Please try again later</p>
              </div>
            )}

            {!statementLoading && !statementError && statement && (
              <div className="space-y-6">
                {/* Account Summary */}
                <ModernCard>
                  <ModernCardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{statement.account.name}</h3>
                        <ModernBadge 
                          variant={statement.account.type === "bank" ? "default" : "success"}
                          className="mt-2 capitalize"
                        >
                          {statement.account.type}
                        </ModernBadge>
                      </div>
                      {typeof statement.account.balance === "number" && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Current Balance</p>
                          <div className="text-3xl font-bold text-gray-900">
                            ₹{statement.account.balance.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </ModernCardContent>
                </ModernCard>

                {/* Transactions - Reversed order (newest first) */}
                {Array.isArray(statement.txns) && statement.txns.length > 0 ? (
                  <ModernCard>
                    <ModernCardHeader>
                      <div className="flex items-center justify-between">
                        <ModernCardTitle>Recent Transactions</ModernCardTitle>
                        <div className="flex items-center gap-2">
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFromModal('csv')}
                            disabled={downloading !== null}
                            title="Download CSV"
                          >
                            {downloading === 'csv' ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                            ) : (
                              <Table className="h-3 w-3" />
                            )}
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFromModal('excel')}
                            disabled={downloading !== null}
                            title="Download Excel"
                          >
                            {downloading === 'excel' ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                            ) : (
                              <FileSpreadsheet className="h-3 w-3" />
                            )}
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFromModal('pdf')}
                            disabled={downloading !== null}
                            title="Download PDF"
                          >
                            {downloading === 'pdf' ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleCloseStatement()
                              router.push(`/accounts/${selectedAccount?._id}/statement`)
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Full Statement
                          </ModernButton>
                        </div>
                      </div>
                    </ModernCardHeader>
                    <ModernCardContent className="p-0">
                      <ModernTable>
                        <ModernTableHeader>
                          <ModernTableRow>
                            <ModernTableHead>Date & Time</ModernTableHead>
                            <ModernTableHead>Type</ModernTableHead>
                            <ModernTableHead>Amount</ModernTableHead>
                            <ModernTableHead>Balance After</ModernTableHead>
                            <ModernTableHead>Remark</ModernTableHead>
                          </ModernTableRow>
                        </ModernTableHeader>
                        <ModernTableBody>
                          {/* Reverse the array to show newest first */}
                          {[...statement.txns].reverse().map((txn) => (
                            <ModernTableRow key={txn._id}>
                              <ModernTableCell>
                                <div className="text-sm">
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
                                <div className={`font-semibold ${
                                  txn.type === "credit" ? "text-green-600" : "text-red-600"
                                }`}>
                                  {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                                </div>
                              </ModernTableCell>
                              <ModernTableCell>
                                <div className="font-medium">
                                  ₹{txn.balanceAfter.toLocaleString()}
                                </div>
                              </ModernTableCell>
                              <ModernTableCell>
                                <div className="max-w-xs truncate text-gray-600">
                                  {txn.remark || "—"}
                                </div>
                              </ModernTableCell>
                            </ModernTableRow>
                          ))}
                        </ModernTableBody>
                      </ModernTable>
                    </ModernCardContent>
                  </ModernCard>
                ) : (
                  <ModernCard>
                    <ModernCardContent className="py-12 text-center">
                      <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <div className="text-gray-500 text-lg font-medium">No transactions found</div>
                      <p className="text-gray-400">This account has no transaction history yet</p>
                    </ModernCardContent>
                  </ModernCard>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Account Modal */}
        <EditAccountModal
          account={editingAccount}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingAccount(null)
          }}
          onSuccess={handleEditSuccess}
        />

        {/* Transfer Money Modal */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Transfer Money</DialogTitle>
              <p className="text-gray-600">Transfer money from wallet to bank account</p>
            </DialogHeader>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              
              // Validate form
              const newErrors: Record<string, string> = {}
              if (!transferFormData.walletId) newErrors.walletId = "Please select a wallet"
              if (!transferFormData.bankId) newErrors.bankId = "Please select a bank account"
              if (!transferFormData.amount || Number(transferFormData.amount) <= 0) {
                newErrors.amount = "Amount must be greater than 0"
              }
              if (!transferFormData.conversionRate || Number(transferFormData.conversionRate) <= 0) {
                newErrors.conversionRate = "Conversion rate must be greater than 0"
              }
              
              setTransferErrors(newErrors)
              if (Object.keys(newErrors).length > 0) return

              setTransferring(true)
              try {
                const result = await apiClient.transferMoney({
                  walletId: transferFormData.walletId,
                  bankId: transferFormData.bankId,
                  amount: Number(transferFormData.amount),
                  conversionRate: Number(transferFormData.conversionRate),
                })
                
                alert(`Successfully transferred ${transferFormData.amount} (${(Number(transferFormData.amount) * Number(transferFormData.conversionRate)).toLocaleString()} INR)`)
                setShowTransferModal(false)
                setTransferFormData({
                  walletId: "",
                  bankId: "",
                  amount: "",
                  conversionRate: "",
                })
                setTransferErrors({})
                await fetchAccounts() // Refresh accounts to show updated balances
              } catch (error: any) {
                console.error("Transfer failed:", error)
                let errorMessage = error?.message || error?.error || "Failed to transfer money. Please try again."
                
                // If error has details, show them
                if (error?.details) {
                  const details = error.details
                  errorMessage += `\n\nFound ${details.foundPayments} on_hold payment(s).`
                  if (details.paymentDetails && details.paymentDetails.length > 0) {
                    errorMessage += `\nPayment breakdown:`
                    details.paymentDetails.forEach((p: any, idx: number) => {
                      errorMessage += `\n${idx + 1}. Amount: ${p.amount}, Charge: ${p.platformCharge}, Net: ${p.netAmount.toFixed(2)}${p.isSplit ? ' (split)' : ''}`
                    })
                  }
                }
                
                setTransferErrors({ submit: errorMessage })
              } finally {
                setTransferring(false)
              }
            }} className="space-y-6">
              {transferErrors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {transferErrors.submit}
                </div>
              )}

              <ModernSelect
                label="From Wallet *"
                value={transferFormData.walletId}
                onChange={(e) => {
                  setTransferFormData({ ...transferFormData, walletId: e.target.value })
                  if (transferErrors.walletId) setTransferErrors({ ...transferErrors, walletId: "" })
                }}
                options={[
                  { value: "", label: "Select Wallet" },
                  ...accounts.filter(acc => acc.type === "wallet").map(acc => ({
                    value: acc._id,
                    label: `${acc.name} (Balance: ₹${(acc.balance || 0).toLocaleString()})`
                  }))
                ]}
                error={transferErrors.walletId}
              />

              <ModernSelect
                label="To Bank Account *"
                value={transferFormData.bankId}
                onChange={(e) => {
                  setTransferFormData({ ...transferFormData, bankId: e.target.value })
                  if (transferErrors.bankId) setTransferErrors({ ...transferErrors, bankId: "" })
                }}
                options={[
                  { value: "", label: "Select Bank Account" },
                  ...accounts.filter(acc => acc.type === "bank").map(acc => ({
                    value: acc._id,
                    label: `${acc.name} (Balance: ₹${(acc.balance || 0).toLocaleString()})`
                  }))
                ]}
                error={transferErrors.bankId}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Amount (Original Currency) *"
                  type="number"
                  step="0.01"
                  value={transferFormData.amount}
                  onChange={(e) => {
                    setTransferFormData({ ...transferFormData, amount: e.target.value })
                    if (transferErrors.amount) setTransferErrors({ ...transferErrors, amount: "" })
                  }}
                  placeholder="e.g., 1000"
                  icon={<DollarSign className="h-4 w-4" />}
                  error={transferErrors.amount}
                />

                <ModernInput
                  label="Conversion Rate *"
                  type="number"
                  step="0.01"
                  value={transferFormData.conversionRate}
                  onChange={(e) => {
                    setTransferFormData({ ...transferFormData, conversionRate: e.target.value })
                    if (transferErrors.conversionRate) setTransferErrors({ ...transferErrors, conversionRate: "" })
                  }}
                  placeholder="e.g., 83.5"
                  icon={<DollarSign className="h-4 w-4" />}
                  error={transferErrors.conversionRate}
                />
              </div>

              {transferFormData.amount && transferFormData.conversionRate && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Amount in INR:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₹{(Number(transferFormData.amount) * Number(transferFormData.conversionRate)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will automatically release on_hold payments from the selected wallet (oldest first) and transfer them to the bank account. If the amount exceeds a single payment, payments will be split as needed.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1" loading={transferring} disabled={transferring}>
                  Transfer Money
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTransferModal(false)
                    setTransferFormData({
                      walletId: "",
                      bankId: "",
                      amount: "",
                      conversionRate: "",
                    })
                    setTransferErrors({})
                  }}
                  className="flex-1"
                  disabled={transferring}
                >
                  Cancel
                </ModernButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ModernMainLayout>
  )
}
