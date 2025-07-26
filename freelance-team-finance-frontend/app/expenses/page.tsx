"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { Plus, Search, Edit, Trash2 } from "lucide-react"

interface Expense {
  _id: string
  type: string
  name: string
  amount: number
  date: string
  withdrawAccount?: string
  notes: string
  user: {
    name: string
    email: string
  }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    type: "general",
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    withdrawAccount: "",
    notes: "",
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  useEffect(() => {
    apiClient.getAccounts().then(data => {
      setAccounts(Array.isArray(data) ? data : (data.accounts || []));
    });
  }, []);

const fetchExpenses = async () => {
  try {
    const data = await apiClient.getExpenses();
    // SUPPORT BOTH SHAPES
    const expensesArr = Array.isArray(data)
      ? data
      : Array.isArray(data.expenses)
        ? data.expenses
        : [];
    setExpenses(expensesArr);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      fetchExpenses()
    } catch (error) {
      console.error("Failed to create expense:", error)
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await apiClient.request(`/api/expenses/${expenseId}`, { method: "DELETE" })
        setExpenses(expenses.filter((e) => e._id !== expenseId))
      } catch (error) {
        console.error("Failed to delete expense:", error)
      }
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || expense.type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "general":
        return "bg-blue-100 text-blue-800"
      case "personal":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expenses & Withdrawals</h1>
            <p className="text-gray-600">Track team expenses and personal withdrawals</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹
                {filteredExpenses
                  .filter((e) => e.type === "general")
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹
                {filteredExpenses
                  .filter((e) => e.type === "personal")
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        {/* Add Expense Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="general">General Expense</option>
                      <option value="personal">Personal Withdrawal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Enter expense name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date *</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  {formData.type === "personal" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Withdraw Account</label>
                      <Input
                        value={formData.withdrawAccount}
                        onChange={(e) => setFormData({ ...formData, withdrawAccount: e.target.value })}
                        placeholder="Account used for withdrawal"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Withdraw Account *</label>
                  <select
                    value={formData.withdrawAccount}
                    onChange={e => setFormData({ ...formData, withdrawAccount: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <Button type="submit">Add Expense</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No expenses found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
  <div key={expense._id} className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{expense.name}</h3>
          <Badge className={getTypeColor(expense.type)}>{expense.type}</Badge>
        </div>
        <div className="text-sm text-gray-600">
          <p>Amount: {expense.amount}</p>
          <p>Date: {new Date(expense.date).toLocaleDateString()}</p>
          <p>By: {expense.createdBy?.name || "-"}</p>
          {expense.withdrawAccount && (
            <p>
              Account: {typeof expense.withdrawAccount === "object"
                ? expense.withdrawAccount.name
                : expense.withdrawAccount}
            </p>
          )}
          {expense.notes && <p>Notes: {expense.notes}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDelete(expense._id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
