"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { StatCard } from "@/components/ui/stat-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernButton } from "@/components/ui/modern-button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { 
  CreditCard, 
  Wallet, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  RefreshCcw,
  Users,
  FolderOpen,
  Target,
  Award
} from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

type Account = {
  _id: string
  type: "bank" | "wallet" | string
  name: string
  details: string
  balance?: number
}

type MonthlyDatum = { month: string; total: number }

const swrFetcher = (endpoint: string) => apiClient.request(endpoint)

const currency = (n = 0) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function monthLabel(m: string) {
  const [y, mm] = m.split("-")
  const d = new Date(Number(y), Number(mm) - 1, 1)
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

function normalizeMonthly(raw: any[]): MonthlyDatum[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => ({
      month: typeof r.month === "string" ? r.month : r._id?.month || r._id || "",
      total: Number(r.total ?? r.amount ?? 0),
    }))
    .filter((r) => r.month)
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ModernDashboardPage() {
  const { user } = useAuth()
  const isAdminOwner = user?.role === "admin" || user?.role === "owner"

  // Only fetch when user can see full dashboard
  const {
    data: accountsResp,
    error: accountsError,
    isLoading: accountsLoading,
    mutate: refreshAccounts,
  } = useSWR<any>(isAdminOwner ? "/api/accounts" : null, swrFetcher)

  const accounts: Account[] = useMemo(() => {
    if (!isAdminOwner) return []
    if (Array.isArray(accountsResp)) return accountsResp
    if (accountsResp && Array.isArray(accountsResp.accounts)) return accountsResp.accounts
    return []
  }, [accountsResp, isAdminOwner])

  const { data: incomeRaw, isLoading: incomeLoading, error: incomeError } = useSWR<any[]>(
    isAdminOwner ? "/api/reports/income?groupBy=month" : null,
    swrFetcher
  )
  const { data: expensesRaw, isLoading: expensesLoading, error: expensesError } = useSWR<any[]>(
    isAdminOwner ? "/api/reports/expenses?groupBy=month" : null,
    swrFetcher
  )
  const { data: generalRaw, isLoading: generalLoading, error: generalError } = useSWR<any[]>(
    isAdminOwner ? "/api/reports/general-expenses?groupBy=month" : null,
    swrFetcher
  )

  const income = useMemo(() => normalizeMonthly(incomeRaw || []), [incomeRaw])
  const expenses = useMemo(() => normalizeMonthly(expensesRaw || []), [expensesRaw])
  const general = useMemo(() => normalizeMonthly(generalRaw || []), [generalRaw])

  const { bankTotal, walletTotal, grandTotal } = useMemo(() => {
    const bank = accounts.filter((a) => a.type === "bank").reduce((s, a) => s + (a.balance || 0), 0)
    const wallet = accounts.filter((a) => a.type === "wallet").reduce((s, a) => s + (a.balance || 0), 0)
    return { bankTotal: bank, walletTotal: wallet, grandTotal: bank + wallet }
  }, [accounts])

  const loading = isAdminOwner && (accountsLoading || incomeLoading || expensesLoading || generalLoading)

  // Sample pie chart data
  const pieData = [
    { name: 'Bank Accounts', value: bankTotal, color: '#3B82F6' },
    { name: 'Digital Wallets', value: walletTotal, color: '#10B981' },
  ]

  return (
    <ModernMainLayout>
      {!isAdminOwner ? (
        // ======= Minimal view for non-admin/owner roles =======
        <div className="flex items-center justify-center min-h-[60vh]">
          <ModernCard className="max-w-2xl w-full text-center">
            <ModernCardHeader>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Users className="w-12 h-12 text-white" />
              </div>
              <ModernCardTitle className="text-3xl">Welcome to Infero Infotech! 👋</ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent className="space-y-4">
              <p className="text-gray-600 text-lg">
                Hi <span className="font-semibold text-blue-600">{user?.name?.split(" ")?.[0] || "there"}</span>, 
                your account is successfully set up and ready to go.
              </p>
              <ModernBadge variant="success" className="text-sm py-2 px-4">
                Account Active • {user?.role?.toUpperCase()}
              </ModernBadge>
              <div className="pt-4">
                <p className="text-gray-500">
                  You currently don't have access to the full dashboard analytics. 
                  Please use the sidebar to access your available tools and features.
                </p>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>
      ) : (
        // ======= Full dashboard for admin/owner =======
        <div className="space-y-8 max-w-full">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 text-lg">
                Welcome back, <span className="font-semibold text-blue-600">{user?.name}</span>! 
                Here's what\'s happening with your business today.
              </p>
            </div>
            <div className="flex gap-3">
              <ModernButton
                variant="outline"
                onClick={() => refreshAccounts && refreshAccounts()}
                disabled={!refreshAccounts || loading}
              >
                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                Refresh Data
              </ModernButton>
              <ModernButton>
                <Target className="w-4 h-4" />
                View Reports
              </ModernButton>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Balance"
              value={currency(grandTotal)}
              subtitle="All accounts combined"
              icon={<IndianRupee className="w-6 h-6" />}
              variant="gradient"
              trend={{ value: 12.5, isPositive: true }}
            />
            <StatCard
              title="Bank Balance"
              value={currency(bankTotal)}
              subtitle="Available in banks"
              icon={<CreditCard className="w-6 h-6" />}
              trend={{ value: 8.2, isPositive: true }}
            />
            <StatCard
              title="Wallet Balance"
              value={currency(walletTotal)}
              subtitle="Digital wallets"
              icon={<Wallet className="w-6 h-6" />}
              trend={{ value: 15.3, isPositive: true }}
            />
            <StatCard
              title="Active Accounts"
              value={accounts.length}
              subtitle="Total accounts"
              icon={<Award className="w-6 h-6" />}
            />
          </section>

          {/* Accounts Overview */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Account Portfolio</h2>
                <p className="text-gray-600">Manage and monitor all your financial accounts</p>
              </div>
              <ModernBadge variant="info" size="lg">
                {Array.isArray(accounts) ? accounts.length : 0} Total
              </ModernBadge>
            </div>

            {loading && !accounts.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <LoadingSkeleton key={i} variant="card" />
                ))}
              </div>
            ) : accountsError ? (
              <ModernCard>
                <ModernCardContent className="py-12 text-center">
                  <div className="text-red-500 text-lg font-medium">Failed to load accounts</div>
                  <p className="text-gray-500 mt-2">Please try refreshing the page</p>
                </ModernCardContent>
              </ModernCard>
            ) : accounts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {accounts.slice(0, 6).map((account) => (
                    <ModernCard key={account._id} className="group hover:shadow-xl transition-all duration-300">
                      <ModernCardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <ModernCardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                            {account.name}
                          </ModernCardTitle>
                          <ModernBadge 
                            variant={account.type === "bank" ? "default" : "success"}
                            className="capitalize"
                          >
                            {account.type}
                          </ModernBadge>
                        </div>
                      </ModernCardHeader>
                      <ModernCardContent>
                        <div className="space-y-3">
                          <div className="text-2xl font-bold text-gray-900">
                            {currency(account.balance || 0)}
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {account.details || "No details available"}
                          </p>
                          <div className="flex items-center gap-2 pt-2">
                            {account.type === "bank" ? (
                              <CreditCard className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Wallet className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-xs text-gray-400 capitalize">{account.type} Account</span>
                          </div>
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  ))}
                </div>
                
                {/* Balance Distribution Chart */}
                {pieData.some(d => d.value > 0) && (
                  <ModernCard>
                    <ModernCardHeader>
                      <ModernCardTitle>Balance Distribution</ModernCardTitle>
                    </ModernCardHeader>
                    <ModernCardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => [currency(value), "Amount"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                )}
              </>
            ) : (
              <ModernCard>
                <ModernCardContent className="py-12 text-center">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500 text-lg font-medium">No accounts found</div>
                  <p className="text-gray-400 mt-2">Start by adding your first financial account</p>
                </ModernCardContent>
              </ModernCard>
            )}
          </section>

          {/* Financial Trends */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Financial Trends</h2>
                <p className="text-gray-600">Monthly performance and insights</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Income Trend */}
              <ModernCard className="xl:col-span-1">
                <ModernCardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <ModernCardTitle className="text-base">Monthly Income</ModernCardTitle>
                    <p className="text-sm text-gray-600">Revenue trends</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </ModernCardHeader>
                <ModernCardContent>
                  {incomeError ? (
                    <div className="text-sm text-red-600 text-center py-8">Failed to load income data</div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={income.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any) => [currency(v), "Income"]} />
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ModernCardContent>
              </ModernCard>

              {/* Expenses Trend */}
              <ModernCard className="xl:col-span-1">
                <ModernCardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <ModernCardTitle className="text-base">Monthly Expenses</ModernCardTitle>
                    <p className="text-sm text-gray-600">Spending patterns</p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </ModernCardHeader>
                <ModernCardContent>
                  {expensesError ? (
                    <div className="text-sm text-red-600 text-center py-8">Failed to load expenses data</div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expenses.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any) => [currency(v), "Expenses"]} />
                          <Bar dataKey="total" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ModernCardContent>
              </ModernCard>

              {/* General Expenses */}
              <ModernCard className="xl:col-span-1">
                <ModernCardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <ModernCardTitle className="text-base">General Expenses</ModernCardTitle>
                    <p className="text-sm text-gray-600">Operational costs</p>
                  </div>
                  <Layers className="h-5 w-5 text-blue-600" />
                </ModernCardHeader>
                <ModernCardContent>
                  {generalError ? (
                    <div className="text-sm text-red-600 text-center py-8">Failed to load general expenses data</div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={general.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any) => [currency(v), "General Expenses"]} />
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ModernCardContent>
              </ModernCard>
            </div>
          </section>
        </div>
      )}
    </ModernMainLayout>
  )
}