"use client"

import { useEffect, useMemo, useState } from "react"
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
import { formatDateDDMMYYYY } from "@/lib/utils"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Receipt, 
  CreditCard, 
  Wallet, 
  DollarSign,
  Calendar,
  User,
  FileText,
  TrendingDown
} from "lucide-react"

interface Account {
  _id: string
  name: string
  type: string
}

interface Expense {
  _id: string
  type: string
  name: string
  amount: number
  date: string
  withdrawAccount?: string | Account
  notes: string
  createdBy?: {
    name: string
    email: string
  }
}

export default function ModernExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [userFilter, setUserFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [formData, setFormData] = useState({
    type: "general",
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    withdrawAccount: "",
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchExpenses()
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : (data.accounts || []))
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const data = await apiClient.getExpenses()
      const expensesArr = Array.isArray(data) ? data : Array.isArray(data.expenses) ? data.expenses : []
      setExpenses(expensesArr)
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Expense name is required"
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Amount must be greater than 0"
    if (!formData.date) newErrors.date = "Date is required"
    if (!formData.withdrawAccount) newErrors.withdrawAccount = "Please select an account"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const expenseData = {
        ...formData,
        amount: Number(formData.amount),
      }
      await apiClient.createExpense(expenseData)
      setShowAddForm(false)
      setFormData({
        type: "general",
        name: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        withdrawAccount: "",
        notes: "",
      })
      setErrors({})
      fetchExpenses()
    } catch (error) {
      console.error("Failed to create expense:", error)
      setErrors({ submit: "Failed to create expense. Please try again." })
    }
  }

  const handleDelete = async (expenseId: string, expenseName: string) => {
    if (window.confirm(`Are you sure you want to delete "${expenseName}"? This action cannot be undone.`)) {
      try {
        await apiClient.request(`/api/expenses/${expenseId}`, { method: "DELETE" })
        setExpenses(expenses.filter((e) => e._id !== expenseId))
      } catch (error) {
        console.error("Failed to delete expense:", error)
      }
    }
  }

  const userOptions = useMemo(() => {
    const names = new Set<string>()
    expenses.forEach((expense) => {
      if (expense.createdBy?.name) names.add(expense.createdBy.name)
    })
    return Array.from(names)
  }, [expenses])

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || expense.type === typeFilter
    const matchesUser = !userFilter || expense.createdBy?.name === userFilter
    const expenseDateValue = expense.date ? new Date(expense.date).getTime() : null
    const matchesFrom = !dateFrom || (expenseDateValue !== null && expenseDateValue >= new Date(dateFrom).getTime())
    const matchesTo = !dateTo || (expenseDateValue !== null && expenseDateValue <= new Date(dateTo).getTime())
    return matchesSearch && matchesType && matchesUser && matchesFrom && matchesTo
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "general": return "info"
      case "personal": return "success"
      default: return "secondary"
    }
  }

  const getAccountName = (account: string | Account | undefined) => {
    if (!account) return "—"
    if (typeof account === "object") return account.name
    const foundAccount = accounts.find(a => a._id === account)
    return foundAccount?.name || account
  }

  // Statistics
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const generalExpenses = filteredExpenses.filter(e => e.type === "general").reduce((sum, e) => sum + e.amount, 0)
  const personalExpenses = filteredExpenses.filter(e => e.type === "personal").reduce((sum, e) => sum + e.amount, 0)

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Expense Management</h1>
            <p className="text-gray-600 text-lg">
              Track team expenses and personal withdrawals efficiently
            </p>
          </div>
          <ModernButton onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            Add Expense
          </ModernButton>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Expenses</ModernCardTitle>
                  <p className="text-white/80 text-sm">All categories</p>
                </div>
                <TrendingDown className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">
                ₹{totalExpenses.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">General Expenses</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Business costs</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{generalExpenses.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Personal Withdrawals</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Team withdrawals</p>
                </div>
                <Wallet className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{personalExpenses.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-2">
                <ModernInput
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <ModernSelect
                label="Filter by Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "All Types" },
                  { value: "general", label: "General" },
                  { value: "personal", label: "Personal" }
                ]}
              />
              <ModernSelect
                label="Filter by User"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                options={[
                  { value: "", label: "All Users" },
                  ...userOptions.map(name => ({ value: name, label: name }))
                ]}
              />
              <ModernInput
                label="From Date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
              <ModernInput
                label="To Date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Add Expense Modal */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Expense</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernSelect
                  label="Expense Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  options={[
                    { value: "general", label: "General Expense" },
                    { value: "personal", label: "Personal Withdrawal" }
                  ]}
                />

                <ModernInput
                  label="Expense Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter expense name"
                  icon={<FileText className="h-4 w-4" />}
                  error={errors.name}
                />

                <ModernInput
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  icon={<DollarSign className="h-4 w-4" />}
                  error={errors.amount}
                />

                <ModernInput
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  icon={<Calendar className="h-4 w-4" />}
                  error={errors.date}
                />

                <ModernSelect
                  label="Withdraw Account"
                  value={formData.withdrawAccount}
                  onChange={(e) => setFormData({ ...formData, withdrawAccount: e.target.value })}
                  options={[
                    { value: "", label: "Select Account" },
                    ...accounts.map(acc => ({ value: acc._id, label: `${acc.name} (${acc.type})` }))
                  ]}
                  error={errors.withdrawAccount}
                />
              </div>

              <ModernInput
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes (optional)"
              />

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1">
                  Add Expense
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({
                      type: "general",
                      name: "",
                      amount: "",
                      date: new Date().toISOString().split("T")[0],
                      withdrawAccount: "",
                      notes: "",
                    })
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

        {/* Expenses Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">All Expenses</ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredExpenses.length} of {expenses.length}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No expenses found</p>
                <p className="text-gray-400">Try adjusting your filters or add a new expense</p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Expense</ModernTableHead>
                    <ModernTableHead>Type</ModernTableHead>
                    <ModernTableHead>Amount</ModernTableHead>
                    <ModernTableHead>Date</ModernTableHead>
                    <ModernTableHead>Account</ModernTableHead>
                    <ModernTableHead>Created By</ModernTableHead>
                    <ModernTableHead className="text-right">Actions</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {filteredExpenses.map((expense) => (
                    <ModernTableRow key={expense._id}>
                      <ModernTableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{expense.name}</div>
                            {expense.notes && (
                              <div className="text-sm text-gray-500 line-clamp-1">{expense.notes}</div>
                            )}
                          </div>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge variant={getTypeColor(expense.type)} className="capitalize">
                          {expense.type}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="font-semibold text-lg text-red-600">
                          -₹{expense.amount.toLocaleString()}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-sm">
                          {formatDateDDMMYYYY(expense.date)}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-gray-600">
                          {getAccountName(expense.withdrawAccount)}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {expense.createdBy?.name || "—"}
                          </span>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <ModernButton variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(expense._id, expense.name)}
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
      </div>
    </ModernMainLayout>
  )
}