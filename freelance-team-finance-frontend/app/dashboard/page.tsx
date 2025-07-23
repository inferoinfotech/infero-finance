"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { DollarSign, TrendingUp, Users, FolderOpen } from "lucide-react"

interface Summary {
  totalIncome: number
  totalExpenses: number
  pendingPayments: number
  activeProjects: number
  bankBalance: number
  walletBalance: number
}

export default function DashboardPage() {
  const [teamSummary, setTeamSummary] = useState<Summary | null>(null)
  const [userSummary, setUserSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const [team, user] = await Promise.all([apiClient.getTeamSummary(), apiClient.getUserSummary()])
        setTeamSummary(team)
        setUserSummary(user)
      } catch (error) {
        console.error("Failed to fetch summaries:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [])

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your freelancing team's performance</p>
        </div>

        {/* Team Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{teamSummary?.totalIncome?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{teamSummary?.totalExpenses?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamSummary?.activeProjects || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{teamSummary?.pendingPayments?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Personal Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Your Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{userSummary?.totalIncome?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{teamSummary?.bankBalance?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{teamSummary?.walletBalance?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
