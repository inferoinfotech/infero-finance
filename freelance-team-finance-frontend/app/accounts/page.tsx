"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { Plus, Edit, Trash2, CreditCard, Wallet } from "lucide-react"

interface Account {
  _id: string
  type: string
  name: string
  details: string
  balance?: number
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    type: "bank",
    name: "",
    details: "",
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

const fetchAccounts = async () => {
  try {
    const data = await apiClient.getAccounts()
    console.log("Fetched accounts data:", data)
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.createAccount(formData)
      setShowAddForm(false)
      setFormData({
        type: "bank",
        name: "",
        details: "",
      })
      fetchAccounts()
    } catch (error) {
      console.error("Failed to create account:", error)
    }
  }

  const handleDelete = async (accountId: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      try {
        await apiClient.request(`/api/accounts/${accountId}`, { method: "DELETE" })
        setAccounts(accounts.filter((a) => a._id !== accountId))
      } catch (error) {
        console.error("Failed to delete account:", error)
      }
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bank":
        return "bg-blue-100 text-blue-800"
      case "wallet":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "bank" ? CreditCard : Wallet
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-600">Manage your bank accounts and wallets</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bank Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.filter((a) => a.type === "bank").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.filter((a) => a.type === "wallet").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="bank">Bank Account</option>
                      <option value="wallet">Digital Wallet</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., HDFC Savings, PayPal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Details *</label>
                  <Input
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    required
                    placeholder="Account number, email, or other identifying details"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit">Add Account</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const IconComponent = getTypeIcon(account.type)
            return (
              <Card key={account._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                    </div>
                    <Badge className={getTypeColor(account.type)}>{account.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Details:</strong> {account.details}
                      </p>
                    </div>
                    {account.balance !== undefined && (
                      <div className="text-lg font-semibold">Balance: ₹{account.balance.toLocaleString()}</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No accounts found</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
