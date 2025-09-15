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
import { apiClient } from "@/lib/api"
import { 
  Plus, 
  Edit, 
  Trash2, 
  CreditCard, 
  Wallet, 
  DollarSign,
  Search,
  Filter,
  Eye,
  TrendingUp,
  Building2
} from "lucide-react"
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [formData, setFormData] = useState({
    type: "bank",
    name: "",
    details: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statementOpen, setStatementOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

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
      setFormData({ type: "bank", name: "", details: "" })
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

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.details.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || account.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  const bankBalance = accounts.filter(a => a.type === "bank").reduce((sum, a) => sum + (a.balance || 0), 0)
  const walletBalance = accounts.filter(a => a.type === "wallet").reduce((sum, a) => sum + (a.balance || 0), 0)

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
          <ModernButton onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            Add Account
          </ModernButton>
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

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <ModernInput
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="lg:w-48">
                <ModernSelect
                  label="Filter by Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Types" },
                    ...accountTypeOptions
                  ]}
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
                    setFormData({ type: "bank", name: "", details: "" })
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

        {/* Accounts Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">All Accounts</ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredAccounts.length} of {accounts.length}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No accounts found</p>
                <p className="text-gray-400">Try adjusting your filters or add a new account</p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Account</ModernTableHead>
                    <ModernTableHead>Type</ModernTableHead>
                    <ModernTableHead>Balance</ModernTableHead>
                    <ModernTableHead>Details</ModernTableHead>
                    <ModernTableHead className="text-right">Actions</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {filteredAccounts.map((account) => (
                    <ModernTableRow key={account._id}>
                      <ModernTableCell>
                        <div className="flex items-center gap-3">
                          {account.type === "bank" ? (
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <Wallet className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{account.name}</div>
                          </div>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge 
                          variant={account.type === "bank" ? "default" : "success"}
                          className="capitalize"
                        >
                          {account.type}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="font-semibold text-lg">
                          ₹{(account.balance || 0).toLocaleString()}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="max-w-xs truncate text-gray-600">
                          {account.details}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatement(account)}
                          >
                            <Eye className="h-4 w-4" />
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
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
                      </ModernTableCell>
                    </ModernTableRow>
                  ))}
                </ModernTableBody>
              </ModernTable>
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

                {/* Transactions */}
                {Array.isArray(statement.txns) && statement.txns.length > 0 ? (
                  <ModernCard>
                    <ModernCardHeader>
                      <ModernCardTitle>Recent Transactions</ModernCardTitle>
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
                          {statement.txns.map((txn) => (
                            <ModernTableRow key={txn._id}>
                              <ModernTableCell>
                                <div className="text-sm">
                                  {new Date(txn.createdAt).toLocaleString()}
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
      </div>
    </ModernMainLayout>
  )
}