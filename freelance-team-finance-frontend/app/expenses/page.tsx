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
import { initializeReminderChecker, requestNotificationPermission } from "@/lib/reminderNotifications"
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
  TrendingDown,
  X,
  Bell
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Account {
  _id: string
  name: string
  type: string
}

interface ExpenseCategory {
  _id: string
  name: string
  description?: string
}

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface Expense {
  _id: string
  type: string
  name: string
  amount: number
  date: string
  category?: ExpenseCategory | string
  withdrawAccount?: string | Account
  toUser?: User | string
  reminder?: string
  reminderDate?: string
  notes: string
  createdBy?: {
    name: string
    email: string
  }
}

export default function ModernExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [activeTab, setActiveTab] = useState<"general" | "personal" | "upcoming">("general")
  const [searchTerm, setSearchTerm] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [ownerUsers, setOwnerUsers] = useState<User[]>([])
  const [userFilter, setUserFilter] = useState("")
  const [toUserFilter, setToUserFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [accountFilter, setAccountFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({ name: "", description: "" })
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    type: "general",
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    toUser: "",
    walletAccount: "",
    bankAccount: "",
    reminder: "",
    reminderDate: "",
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchExpenses()
    fetchAccounts()
    fetchCategories()
    fetchOwnerUsers()

    // Initialize reminder notifications
    const initReminders = async () => {
      await requestNotificationPermission()
      // Check reminders every hour
      initializeReminderChecker(async () => {
        const data = await apiClient.getExpenses()
        const expensesArr = Array.isArray(data) ? data : Array.isArray(data.expenses) ? data.expenses : []
        return expensesArr.filter((e: Expense) => e.reminderDate) as any[]
      }, 60)
    }
    initReminders()
  }, [])

  const fetchOwnerUsers = async () => {
    try {
      const data = await apiClient.getUsers({ limit: 100 })
      const users = Array.isArray(data.users) ? data.users : []
      // Filter only owner role users
      setOwnerUsers(users.filter((u: User) => u.role === "owner"))
    } catch (error) {
      console.error("Failed to fetch owner users:", error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : (data.accounts || []))
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiClient.getExpenseCategories()
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryErrors({ name: "Category name is required" })
      return
    }

    try {
      const response = await apiClient.createExpenseCategory(categoryFormData)
      const newCategory = response.category
      setShowAddCategory(false)
      setCategoryFormData({ name: "", description: "" })
      setCategoryErrors({})
      await fetchCategories()
      // Automatically select the newly created category
      if (newCategory?._id) {
        setFormData({ ...formData, category: newCategory._id })
      }
    } catch (error: any) {
      setCategoryErrors({ submit: error?.message || "Failed to create category" })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return
    }

    try {
      await apiClient.deleteExpenseCategory(categoryId)
      // Clear category from form if it was selected
      if (formData.category === categoryId) {
        setFormData({ ...formData, category: "" })
      }
      fetchCategories()
    } catch (error: any) {
      alert(error?.message || "Failed to delete category. It may be in use by some expenses.")
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
    if (formData.type === "personal" && !formData.toUser) {
      newErrors.toUser = "Please select an owner"
    }
    if (!formData.walletAccount && !formData.bankAccount) {
      newErrors.walletAccount = "Please select either a wallet or bank account"
      newErrors.bankAccount = "Please select either a wallet or bank account"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const expenseData: any = {
        type: formData.type,
        name: formData.name,
        amount: Number(formData.amount),
        date: formData.date,
        withdrawAccount: formData.walletAccount || formData.bankAccount,
      }
      
      // Handle category - include if selected
      if (formData.category) {
        expenseData.category = formData.category
      } else if (editingExpense) {
        // If editing and category was removed, explicitly set to null to clear it
        expenseData.category = null
      }
      
      // Handle toUser - only for personal expenses
      if (formData.type === "personal") {
        if (formData.toUser) {
          expenseData.toUser = formData.toUser
        } else if (editingExpense) {
          // If editing personal expense and toUser was removed, explicitly set to null
          expenseData.toUser = null
        }
      } else if (editingExpense && editingExpense.type === "personal") {
        // If changing from personal to general, clear toUser
        expenseData.toUser = null
      }
      
      // Include notes (can be empty string)
      expenseData.notes = formData.notes || ""
      
      // Handle reminder and reminderDate
      if (formData.reminder && formData.reminderDate) {
        expenseData.reminder = formData.reminder
        expenseData.reminderDate = formData.reminderDate
      } else {
        // Clear reminder if not set
        expenseData.reminder = null
        expenseData.reminderDate = null
      }
      
      if (editingExpense) {
        // Update existing expense
        await apiClient.updateExpense(editingExpense._id, expenseData)
      } else {
        // Create new expense
        await apiClient.createExpense(expenseData)
      }
      
      setShowAddForm(false)
      setEditingExpense(null)
      setFormData({
        type: activeTab === "upcoming" ? "general" : activeTab,
        name: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        toUser: "",
        walletAccount: "",
        bankAccount: "",
        reminder: "",
        reminderDate: "",
        notes: "",
      })
      setErrors({})
      await fetchExpenses()
    } catch (error) {
      console.error(`Failed to ${editingExpense ? "update" : "create"} expense:`, error)
      setErrors({ submit: `Failed to ${editingExpense ? "update" : "create"} expense. Please try again.` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    // Determine if account is wallet or bank
    const accountId = typeof expense.withdrawAccount === "object" 
      ? expense.withdrawAccount._id 
      : expense.withdrawAccount
    const account = accounts.find(acc => acc._id === accountId)
    const isWallet = account?.type === "wallet"
    
    setFormData({
      type: expense.type,
      name: expense.name,
      amount: expense.amount.toString(),
      date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      category: typeof expense.category === "object" ? expense.category._id : (expense.category || ""),
      toUser: typeof expense.toUser === "object" ? expense.toUser._id : (expense.toUser || ""),
      walletAccount: isWallet ? (accountId || "") : "",
      bankAccount: !isWallet ? (accountId || "") : "",
      reminder: expense.reminder || "",
      reminderDate: expense.reminderDate ? new Date(expense.reminderDate).toISOString().split("T")[0] : "",
      notes: expense.notes || "",
    })
    setEditingExpense(expense)
    setShowAddForm(true)
    setActiveTab(expense.type as "general" | "personal") // Switch to the correct tab
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
    // Filter by active tab
    let matchesTab = false
    if (activeTab === "upcoming") {
      // For upcoming tab, show expenses with reminderDate set
      matchesTab = !!expense.reminderDate
    } else {
      // For general/personal tabs, filter by type
      matchesTab = expense.type === activeTab
    }
    
    const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesUser = !userFilter || expense.createdBy?.name === userFilter
    // For personal expenses, filter by toUser
    const matchesToUser = activeTab !== "personal" || !toUserFilter || 
      (typeof expense.toUser === "object" && expense.toUser?._id === toUserFilter) ||
      (typeof expense.toUser === "string" && expense.toUser === toUserFilter)
    // Filter by category
    const matchesCategory = !categoryFilter ||
      (typeof expense.category === "object" && expense.category?._id === categoryFilter) ||
      (typeof expense.category === "string" && expense.category === categoryFilter)
    // Filter by account
    const matchesAccount = !accountFilter ||
      (typeof expense.withdrawAccount === "object" && expense.withdrawAccount?._id === accountFilter) ||
      (typeof expense.withdrawAccount === "string" && expense.withdrawAccount === accountFilter)
    const expenseDateValue = expense.date ? new Date(expense.date).getTime() : null
    const matchesFrom = !dateFrom || (expenseDateValue !== null && expenseDateValue >= new Date(dateFrom).getTime())
    const matchesTo = !dateTo || (expenseDateValue !== null && expenseDateValue <= new Date(dateTo).getTime())
    return matchesTab && matchesSearch && matchesUser && matchesToUser && matchesCategory && matchesAccount && matchesFrom && matchesTo
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

  const getCategoryName = (category: ExpenseCategory | string | undefined) => {
    if (!category) return "—"
    if (typeof category === "object") return category.name
    const foundCategory = categories.find(c => c._id === category)
    return foundCategory?.name || "—"
  }

  const getToUserName = (toUser: User | string | undefined) => {
    if (!toUser) return "—"
    if (typeof toUser === "object") return toUser.name
    const foundUser = ownerUsers.find(u => u._id === toUser)
    return foundUser?.name || "—"
  }

  // Statistics - based on active tab
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const allExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const generalExpenses = expenses.filter(e => e.type === "general").reduce((sum, e) => sum + e.amount, 0)
  const personalExpenses = expenses.filter(e => e.type === "personal").reduce((sum, e) => sum + e.amount, 0)
  const upcomingExpenses = expenses.filter(e => e.reminderDate).reduce((sum, e) => sum + e.amount, 0)

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
          <ModernButton onClick={() => {
            setEditingExpense(null)
            setFormData({
              type: activeTab === "upcoming" ? "general" : activeTab,
              name: "",
              amount: "",
              date: new Date().toISOString().split("T")[0],
              category: "",
              toUser: "",
              walletAccount: "",
              bankAccount: "",
              reminder: "",
              reminderDate: "",
              notes: "",
            })
            setErrors({})
            setShowAddForm(true)
          }}>
            <Plus className="h-4 w-4" />
            Add Expense
          </ModernButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab("general")
              setToUserFilter("") // Clear toUser filter when switching to general
              setCategoryFilter("") // Clear filters when switching tabs
              setAccountFilter("")
            }}
            className={cn(
              "px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2",
              activeTab === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            General Expenses
          </button>
          <button
            onClick={() => {
              setActiveTab("personal")
              setCategoryFilter("") // Clear filters when switching tabs
              setAccountFilter("")
            }}
            className={cn(
              "px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2",
              activeTab === "personal"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            Personal Withdrawals
          </button>
          <button
            onClick={() => {
              setActiveTab("upcoming")
              setCategoryFilter("") // Clear filters when switching tabs
              setAccountFilter("")
            }}
            className={cn(
              "px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2",
              activeTab === "upcoming"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Upcoming Payments
            </div>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">
                    {activeTab === "general" ? "General Expenses" : activeTab === "personal" ? "Personal Withdrawals" : "Upcoming Payments"}
                  </ModernCardTitle>
                  <p className="text-white/80 text-sm">
                    {activeTab === "general" ? "Business costs" : activeTab === "personal" ? "Team withdrawals" : "Payment reminders"}
                  </p>
                </div>
                {activeTab === "general" ? (
                  <Receipt className="h-8 w-8 text-white/80" />
                ) : activeTab === "personal" ? (
                  <Wallet className="h-8 w-8 text-white/80" />
                ) : (
                  <Bell className="h-8 w-8 text-white/80" />
                )}
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
                  <ModernCardTitle className="text-lg">
                    {activeTab === "general" ? "Total General" : activeTab === "personal" ? "Total Personal" : "Total Upcoming"}
                  </ModernCardTitle>
                  <p className="text-gray-600 text-sm">
                    {activeTab === "upcoming" ? "With reminders" : "All time"}
                  </p>
                </div>
                {activeTab === "general" ? (
                  <Receipt className="h-8 w-8 text-blue-500" />
                ) : activeTab === "personal" ? (
                  <Wallet className="h-8 w-8 text-green-500" />
                ) : (
                  <Bell className="h-8 w-8 text-orange-500" />
                )}
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{activeTab === "general" ? generalExpenses.toLocaleString() : activeTab === "personal" ? personalExpenses.toLocaleString() : upcomingExpenses.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">All Expenses</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Combined total</p>
                </div>
                <TrendingDown className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{allExpenses.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div>
                <ModernInput
                  placeholder="Search expenses by name or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              
              {/* Filter Grid */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                activeTab === "personal" ? "xl:grid-cols-6" : "xl:grid-cols-5"
              )}>
                <ModernSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Categories" },
                    ...categories.map(cat => ({ value: cat._id, label: cat.name }))
                  ]}
                />
                
                {activeTab === "personal" && (
                  <ModernSelect
                    label="Owner"
                    value={toUserFilter}
                    onChange={(e) => setToUserFilter(e.target.value)}
                    options={[
                      { value: "", label: "All Owners" },
                      ...ownerUsers.map(user => ({ value: user._id, label: user.name }))
                    ]}
                  />
                )}
                
                <ModernSelect
                  label="Account"
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Accounts" },
                    ...accounts.map(acc => ({ value: acc._id, label: `${acc.name} (${acc.type})` }))
                  ]}
                />
                
                <ModernSelect
                  label="Created By"
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
              
              {/* Clear Filters Button */}
              {(searchTerm || categoryFilter || accountFilter || userFilter || toUserFilter || dateFrom || dateTo) && (
                <div className="flex justify-end">
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setCategoryFilter("")
                      setAccountFilter("")
                      setUserFilter("")
                      setToUserFilter("")
                      setDateFrom("")
                      setDateTo("")
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear All Filters
                  </ModernButton>
                </div>
              )}
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Add/Edit Expense Modal */}
        <Dialog open={showAddForm} onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingExpense(null)
            setFormData({
              type: activeTab === "upcoming" ? "general" : activeTab,
              name: "",
              amount: "",
              date: new Date().toISOString().split("T")[0],
              category: "",
              toUser: "",
              walletAccount: "",
              bankAccount: "",
              reminder: "",
              reminderDate: "",
              notes: "",
            })
            setErrors({})
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Expense Type</label>
                  <div className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm items-center">
                    <span className="text-gray-700 font-medium">
                      {formData.type === "general" ? "General Expense" : "Personal Withdrawal"}
                    </span>
                  </div>
                  <input type="hidden" value={formData.type} />
                </div>

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

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Category (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        className={cn(
                          "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200",
                          "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
                          "appearance-none cursor-pointer"
                        )}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {formData.category ? (
                      <ModernButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(formData.category)}
                        className="h-12 px-4 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        title="Delete category"
                      >
                        <X className="h-4 w-4" />
                      </ModernButton>
                    ) : (
                      <ModernButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCategory(true)}
                        className="h-12 px-4"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </ModernButton>
                    )}
                  </div>
                </div>

                {formData.type === "personal" && (
                  <ModernSelect
                    label="To Owner *"
                    value={formData.toUser}
                    onChange={(e) => setFormData({ ...formData, toUser: e.target.value })}
                    options={[
                      { value: "", label: "Select Owner" },
                      ...ownerUsers.map(user => ({ value: user._id, label: user.name }))
                    ]}
                    error={errors.toUser}
                  />
                )}

                <ModernSelect
                  label="Wallet Account"
                  value={formData.walletAccount}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ 
                      ...formData, 
                      walletAccount: value,
                      bankAccount: "" // Always clear bank account when wallet is selected
                    })
                    if (errors.walletAccount || errors.bankAccount) {
                      setErrors({ ...errors, walletAccount: "", bankAccount: "" })
                    }
                  }}
                  options={accounts.filter(acc => acc.type === "wallet").map(acc => ({
                    value: acc._id,
                    label: acc.name
                  }))}
                  error={errors.walletAccount}
                />

                <ModernSelect
                  label="Bank Account"
                  value={formData.bankAccount}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ 
                      ...formData, 
                      bankAccount: value,
                      walletAccount: "" // Always clear wallet account when bank is selected
                    })
                    if (errors.walletAccount || errors.bankAccount) {
                      setErrors({ ...errors, walletAccount: "", bankAccount: "" })
                    }
                  }}
                  options={accounts.filter(acc => acc.type === "bank").map(acc => ({
                    value: acc._id,
                    label: acc.name
                  }))}
                  error={errors.bankAccount}
                />
              </div>

              {/* Reminder Section */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableReminder"
                    checked={!!formData.reminder}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, reminder: "Payment reminder", reminderDate: "" })
                      } else {
                        setFormData({ ...formData, reminder: "", reminderDate: "" })
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableReminder" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Set Payment Reminder
                  </label>
                </div>
                {formData.reminder && (
                  <div className="ml-8 space-y-2">
                    <ModernInput
                      label="Reminder Date"
                      type="date"
                      value={formData.reminderDate}
                      onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                      icon={<Calendar className="h-4 w-4" />}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-gray-500">
                      You'll receive a browser notification on this date to remind you about this payment.
                    </p>
                  </div>
                )}
              </div>

              <ModernInput
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes (optional)"
              />

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1" loading={submitting} disabled={submitting}>
                  {editingExpense ? "Update Expense" : "Add Expense"}
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingExpense(null)
                    setFormData({
                      type: activeTab === "upcoming" ? "general" : activeTab,
                      name: "",
                      amount: "",
                      date: new Date().toISOString().split("T")[0],
                      category: "",
                      toUser: "",
                      walletAccount: "",
                      bankAccount: "",
                      reminder: "",
                      reminderDate: "",
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

        {/* Add Category Modal */}
        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Category</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {categoryErrors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {categoryErrors.submit}
                </div>
              )}

              <ModernInput
                label="Category Name"
                value={categoryFormData.name}
                onChange={(e) => {
                  setCategoryFormData({ ...categoryFormData, name: e.target.value })
                  if (categoryErrors.name) setCategoryErrors({ ...categoryErrors, name: "" })
                }}
                placeholder="e.g., Salary, Subscription, Rent"
                error={categoryErrors.name}
              />

              <ModernInput
                label="Description (Optional)"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Brief description of this category"
              />

              <div className="flex gap-4 pt-4">
                <ModernButton onClick={handleAddCategory} className="flex-1">
                  Add Category
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => {
                    setShowAddCategory(false)
                    setCategoryFormData({ name: "", description: "" })
                    setCategoryErrors({})
                  }}
                  className="flex-1"
                >
                  Cancel
                </ModernButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expenses Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">
                {activeTab === "general" ? "General Expenses" : activeTab === "personal" ? "Personal Withdrawals" : "Upcoming Payments"}
              </ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredExpenses.length} of {activeTab === "upcoming" ? expenses.filter(e => e.reminderDate).length : expenses.filter(e => e.type === activeTab).length}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                {activeTab === "upcoming" ? (
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                ) : (
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                )}
                <p className="text-gray-500 text-lg">
                  {activeTab === "upcoming" ? "No upcoming payments found" : "No expenses found"}
                </p>
                <p className="text-gray-400">
                  {activeTab === "upcoming" ? "Set reminders on expenses to see them here" : "Try adjusting your filters or add a new expense"}
                </p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Expense</ModernTableHead>
                    <ModernTableHead>Category</ModernTableHead>
                    {activeTab === "personal" && <ModernTableHead>To Owner</ModernTableHead>}
                    <ModernTableHead>Amount</ModernTableHead>
                    <ModernTableHead>Date</ModernTableHead>
                    {activeTab === "upcoming" && <ModernTableHead>Reminder Date</ModernTableHead>}
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
                        <div className="text-gray-600">
                          {getCategoryName(expense.category)}
                        </div>
                      </ModernTableCell>
                      {activeTab === "personal" && (
                        <ModernTableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {getToUserName(expense.toUser)}
                            </span>
                          </div>
                        </ModernTableCell>
                      )}
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
                      {activeTab === "upcoming" && (
                        <ModernTableCell>
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600">
                              {expense.reminderDate ? formatDateDDMMYYYY(expense.reminderDate) : "—"}
                            </span>
                          </div>
                        </ModernTableCell>
                      )}
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
                          <ModernButton 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
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