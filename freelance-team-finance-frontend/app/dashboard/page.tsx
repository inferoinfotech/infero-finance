"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Wallet, IndianRupee, TrendingUp, TrendingDown, Layers } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts"
import { Button } from "@/components/ui/button"
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

export default function DashboardPage() {
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

  return (
    <MainLayout>
      {!isAdminOwner ? (
        // ======= Minimal view for non-admin/owner roles =======
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to Infero Infotech 👋</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600">
              Hi {user?.name?.split(" ")?.[0] || "there"}, your account is set up.
              <br />
              You currently don’t have access to the full dashboard analytics.
              Please use the sidebar to access your tools.
            </CardContent>
          </Card>
        </div>
      ) : (
        // ======= Full dashboard for admin/owner =======
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">A quick snapshot of balances, accounts and monthly trends.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refreshAccounts && refreshAccounts()}
                disabled={!refreshAccounts}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* MAIN KPIs */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On hold balance (Wallets)</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {accountsError ? (
                    <div className="text-sm text-red-600">Failed to load wallets.</div>
                  ) : (
                    <div className="text-2xl font-bold">{currency(walletTotal)}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Sum of all wallet accounts.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On hand balance (Bank)</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {accountsError ? (
                    <div className="text-sm text-red-600">Failed to load banks.</div>
                  ) : (
                    <div className="text-2xl font-bold">{currency(bankTotal)}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Sum of all bank accounts.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total balance we have</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {accountsError ? (
                    <div className="text-sm text-red-600">Failed to load totals.</div>
                  ) : (
                    <div className="text-2xl font-bold">{currency(grandTotal)}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Bank + Wallets combined.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ACCOUNTS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Accounts</h2>
              <Badge variant="secondary" className="capitalize">
                total: {Array.isArray(accounts) ? accounts.length : 0}
              </Badge>
            </div>

            <div className={cn("grid gap-6", "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
              {loading && !accounts.length ? (
                <Card>
                  <CardContent className="py-10 text-sm text-muted-foreground">Loading accounts…</CardContent>
                </Card>
              ) : accountsError ? (
                <Card>
                  <CardContent className="py-10 text-sm text-red-600">Failed to load accounts.</CardContent>
                </Card>
              ) : accounts.length > 0 ? (
                accounts.map((a) => (
                  <Card key={a._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-semibold truncate">{a.name}</CardTitle>
                      <Badge className={a.type === "bank" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                        {a.type}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{currency(a.balance || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{a.details || "—"}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-10 text-sm text-muted-foreground">No accounts found.</CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* TRENDS */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income (Monthly)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-72">
                  {incomeError ? (
                    <div className="text-sm text-red-600">Failed to load income.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={income.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => currency(v)} />
                        <Line type="monotone" dataKey="total" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses (Monthly)</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-72">
                  {expensesError ? (
                    <div className="text-sm text-red-600">Failed to load expenses.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenses.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => currency(v)} />
                        <Bar dataKey="total" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">General Expenses (Monthly)</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-72">
                  {generalError ? (
                    <div className="text-sm text-red-600">Failed to load general expenses.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={general.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => currency(v)} />
                        <Line type="monotone" dataKey="total" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </MainLayout>
  )
}
