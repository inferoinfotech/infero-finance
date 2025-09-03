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

type Account = {
  _id: string
  type: "bank" | "wallet" | string
  name: string
  details: string
  balance?: number
}

type MonthlyDatum = { month: string; total: number } // month = "YYYY-MM"

// Use apiClient so we include auth headers and base URL
const swrFetcher = (endpoint: string) => apiClient.request(endpoint)

const currency = (n = 0) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function monthLabel(m: string) {
  // "2025-01" -> "Jan 2025"
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
  // 1) Accounts + balances
  const {
    data: accountsResp,
    error: accountsError,
    isLoading: accountsLoading,
    mutate: refreshAccounts,
  } = useSWR<any>("/api/accounts", swrFetcher)

  // Support both shapes: [] or { accounts: [] }
  const accounts: Account[] = useMemo(() => {
    if (Array.isArray(accountsResp)) return accountsResp
    if (accountsResp && Array.isArray(accountsResp.accounts)) return accountsResp.accounts
    return []
  }, [accountsResp])

  // 2) Reports – monthly
  const { data: incomeRaw, isLoading: incomeLoading, error: incomeError } = useSWR<any[]>(
    "/api/reports/income?groupBy=month",
    swrFetcher
  )
  const { data: expensesRaw, isLoading: expensesLoading, error: expensesError } = useSWR<any[]>(
    "/api/reports/expenses?groupBy=month",
    swrFetcher
  )
  const { data: generalRaw, isLoading: generalLoading, error: generalError } = useSWR<any[]>(
    "/api/reports/general-expenses?groupBy=month",
    swrFetcher
  )

  const income = useMemo(() => normalizeMonthly(incomeRaw || []), [incomeRaw])
  const expenses = useMemo(() => normalizeMonthly(expensesRaw || []), [expensesRaw])
  const general = useMemo(() => normalizeMonthly(generalRaw || []), [generalRaw])

  // Derived balances
  const { bankTotal, walletTotal, grandTotal } = useMemo(() => {
    const bank = accounts.filter((a) => a.type === "bank").reduce((s, a) => s + (a.balance || 0), 0)
    const wallet = accounts.filter((a) => a.type === "wallet").reduce((s, a) => s + (a.balance || 0), 0)
    return { bankTotal: bank, walletTotal: wallet, grandTotal: bank + wallet }
  }, [accounts])

  const loading = accountsLoading || incomeLoading || expensesLoading || generalLoading

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">A quick snapshot of balances, accounts and monthly trends.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refreshAccounts()}>Refresh</Button>
          </div>
        </div>

        {/* ====== MAIN KPIs ====== */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* On hold balance = total wallet balance */}
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

            {/* On hand balance = total bank balance */}
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

            {/* Total balance we have */}
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

        {/* ====== SECOND SECTION: ALL ACCOUNTS ====== */}
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

        {/* ====== THIRD SECTION: 3 GRAPHS ====== */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1) Total Income (monthly) */}
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

            {/* 2) Total Expenses (monthly) */}
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

            {/* 3) General Expenses (monthly) */}
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
    </MainLayout>
  )
}
