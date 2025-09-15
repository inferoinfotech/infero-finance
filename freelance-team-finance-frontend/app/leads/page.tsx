"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { apiClient } from "@/lib/api"
import type { Lead } from "@/types/lead"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Plus, Search, Filter, RefreshCcw, X, Users, TrendingUp, Clock, DollarSign } from "lucide-react"

const STAGES = [
  "New",
  "Contacted",
  "In Discussion",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold",
  "No Reply",
]
const PRIORITIES = ["High", "Medium", "Low"]

export default function LeadsPage() {
  const { token, loading } = useAuth()
  const [items, setItems] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [busy, setBusy] = useState(false)

  const [platforms, setPlatforms] = useState<{ _id: string; name: string }[]>([])

  // Filters
  const [q, setQ] = useState("")
  const [stage, setStage] = useState("")
  const [priority, setPriority] = useState("")
  const [platform, setPlatform] = useState("")
  const [nextFrom, setNextFrom] = useState("")
  const [nextTo, setNextTo] = useState("")

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState<any>({
    clientName: "",
    projectDetails: "",
    clientEmail: "",
    clientMobile: "",
    companyName: "",
    priority: "Medium",
    estimatedBudget: 0,
    stage: "New",
    address: { city: "", country: "" },
    tags: [],
    platform: "",
    nextFollowUpDate: "",
    notes: "",
  })

  const canQuery = useMemo(() => !!token && !loading, [token, loading])

  useEffect(() => {
    ;(async () => {
      try {
        const { platforms } = await apiClient.getPlatforms()
        setPlatforms(platforms || [])
      } catch {}
    })()
  }, [])

  const fetchLeads = async (opts?: Partial<{ page: number; limit: number }>) => {
    if (!canQuery) return
    const p = opts?.page ?? page
    const l = opts?.limit ?? limit
    setBusy(true)
    try {
      const data = await apiClient.getLeads({ q, stage, priority, platform, nextFrom, nextTo, page: p, limit: l })
      setItems(data.items || [])
      setTotal(data.total || 0)
      setPage(data.page || p)
      setLimit(data.limit || l)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    fetchLeads({ page: 1 })
  }, [canQuery]) // initial

  const clearFilters = () => {
    setQ("")
    setStage("")
    setPriority("")
    setPlatform("")
    setNextFrom("")
    setNextTo("")
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleCreate = async () => {
    try {
      setBusy(true)
      const payload = {
        ...createData,
        estimatedBudget: Number(createData.estimatedBudget || 0),
        tags: (createData.tags || []).filter(Boolean).map((t: string) => t.trim()),
      }
      if (!payload.clientName?.trim()) {
        alert("Client name is required")
        setBusy(false)
        return
      }
      await apiClient.createLead(payload)
      setShowCreate(false)
      // reset
      setCreateData({
        clientName: "",
        projectDetails: "",
        clientEmail: "",
        clientMobile: "",
        companyName: "",
        priority: "Medium",
        estimatedBudget: 0,
        stage: "New",
        address: { city: "", country: "" },
        tags: [],
        platform: "",
        nextFollowUpDate: "",
        notes: "",
      })
      fetchLeads({ page: 1 })
    } catch (e: any) {
      alert(e?.message || "Failed to create lead")
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div
            className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-0 left-0 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-float"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        <div className="relative z-10 p-6 space-y-8">
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Lead Management
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Track and manage your sales pipeline</p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="h-5 w-5" /> New Lead
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{total}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Won Deals</p>
                    <p className="text-2xl font-bold text-green-600">{items.filter((l) => l.stage === "Won").length}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {
                        items.filter((l) =>
                          ["Contacted", "In Discussion", "Proposal Sent", "Negotiation"].includes(l.stage),
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₹{items.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search client, notes, tags..."
                  className="w-full border-0 bg-gray-50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value="">All</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value="">All</option>
                  {PRIORITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value="">All</option>
                  {platforms.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">From</label>
                  <input
                    type="date"
                    value={nextFrom}
                    onChange={(e) => setNextFrom(e.target.value)}
                    className="w-full border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">To</label>
                  <input
                    type="date"
                    value={nextTo}
                    onChange={(e) => setNextTo(e.target.value)}
                    className="w-full border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => fetchLeads({ page: 1 })}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-black hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Filter className="h-4 w-4" /> Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <X className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={() => fetchLeads()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 ml-auto"
              >
                <RefreshCcw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Client</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Stage</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Priority</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Budget</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Platform</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Next Follow-Up</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Updated</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{lead.clientName}</div>
                        <div className="text-gray-500 text-sm">{lead.clientEmail || lead.clientMobile || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            lead.stage === "Won"
                              ? "bg-green-100 text-green-800"
                              : lead.stage === "Lost"
                                ? "bg-red-100 text-red-800"
                                : ["Contacted", "In Discussion", "Proposal Sent", "Negotiation"].includes(lead.stage)
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium
                          ${
                            lead.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : lead.priority === "Low"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-green-600">
                        {lead.estimatedBudget ? `₹ ${lead.estimatedBudget.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {(typeof lead.platform === "object" && lead.platform?.name) || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/leads/${lead._id}`}
                          className="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td className="px-6 py-12 text-center text-gray-500" colSpan={8}>
                        {busy ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600 mr-3"></div>
                            Loading...
                          </div>
                        ) : (
                          "No leads found."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{items.length}</span> of{" "}
                <span className="font-semibold">{total}</span> leads
              </div>
              <div className="flex items-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => fetchLeads({ page: page - 1 })}
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 ${page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 shadow-lg hover:shadow-xl"}`}
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-white rounded-lg shadow-lg font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchLeads({ page: page + 1 })}
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 ${page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 shadow-lg hover:shadow-xl"}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {showCreate && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-sm w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Create New Lead
                    </h2>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Form fields with modern styling */}
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Client Name *"
                      value={createData.clientName}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, clientName: e.target.value }))}
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Company"
                      value={createData.companyName}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, companyName: e.target.value }))}
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Email"
                      value={createData.clientEmail}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, clientEmail: e.target.value }))}
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Mobile"
                      value={createData.clientMobile}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, clientMobile: e.target.value }))}
                    />
                    <select
                      className="border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      value={createData.stage}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, stage: e.target.value }))}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      value={createData.priority}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, priority: e.target.value }))}
                    >
                      {PRIORITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Estimated Budget"
                      type="number"
                      value={createData.estimatedBudget}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, estimatedBudget: e.target.value }))}
                    />
                    <select
                      className="border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      value={createData.platform}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, platform: e.target.value }))}
                    >
                      <option value="">Select Platform</option>
                      {platforms.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="City"
                      value={createData.address.city}
                      onChange={(e) =>
                        setCreateData((s: any) => ({ ...s, address: { ...s.address, city: e.target.value } }))
                      }
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Country"
                      value={createData.address.country}
                      onChange={(e) =>
                        setCreateData((s: any) => ({ ...s, address: { ...s.address, country: e.target.value } }))
                      }
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Tags (comma separated)"
                      value={(createData.tags || []).join(", ")}
                      onChange={(e) =>
                        setCreateData((s: any) => ({
                          ...s,
                          tags: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                    <input
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      type="datetime-local"
                      value={createData.nextFollowUpDate}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, nextFollowUpDate: e.target.value }))}
                    />
                    <textarea
                      className="border-0 bg-gray-50 rounded-lg px-4 py-3 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      placeholder="Project Details / Notes"
                      rows={3}
                      value={createData.projectDetails}
                      onChange={(e) => setCreateData((s: any) => ({ ...s, projectDetails: e.target.value }))}
                    />
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-4">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-6 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {busy ? "Creating..." : "Create Lead"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
