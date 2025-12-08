"use client"

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react"
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
import type { Lead } from "@/types/lead"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  X, 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  DollarSign,
  Eye
} from "lucide-react"

const STAGES = ["New","Contacted","In Discussion","Proposal Sent","Negotiation","Won","Lost","On Hold","No Reply"]
const PRIORITIES = ["High","Medium","Low"]

function LeadsPageContent() {
  const { token, loading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [busy, setBusy] = useState(false)

  const [platforms, setPlatforms] = useState<{_id:string; name:string}[]>([])

  // Initialize filters from URL params
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [stage, setStage] = useState(searchParams.get("stage") || "")
  const [priority, setPriority] = useState(searchParams.get("priority") || "")
  const [platform, setPlatform] = useState(searchParams.get("platform") || "")
  const [nextFrom, setNextFrom] = useState(searchParams.get("nextFrom") || "")
  const [nextTo, setNextTo] = useState(searchParams.get("nextTo") || "")
  const [followUpPreset, setFollowUpPreset] = useState<"all" | "today" | "tomorrow" | "yesterday" | "custom">(
    (searchParams.get("followUpPreset") as "all" | "today" | "tomorrow" | "yesterday" | "custom") || "all"
  )
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "lost" | "won">(
    (searchParams.get("statusFilter") as "all" | "active" | "lost" | "won") || "all"
  )

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
    notes: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const canQuery = useMemo(() => !!token && !loading, [token, loading])
  const isInitialMount = useRef(true)

  // Update URL params when filters change
  const updateURLParams = useCallback((updates: Record<string, string>) => {
    if (isInitialMount.current) return // Don't update URL on initial mount
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`/leads?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    (async () => {
      try {
        const { platforms } = await apiClient.getPlatforms()
        setPlatforms(platforms || [])
      } catch {}
    })()
  }, [])

  // Restore date ranges from URL on mount
  useEffect(() => {
    // If URL has custom dates, ensure preset is set to custom
    if (nextFrom || nextTo) {
      if (followUpPreset !== "custom") {
        setFollowUpPreset("custom")
      }
    } else if (followUpPreset && followUpPreset !== "all" && followUpPreset !== "custom") {
      // Restore preset-based date ranges
      setDateRangeFromPreset(followUpPreset)
    }
    // Mark initial mount as complete after first render
    isInitialMount.current = false
  }, []) // Only run on mount

  // Auto-apply filters when they change (debounced for search)
  const [debouncedQ, setDebouncedQ] = useState(q)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q)
    }, 500)
    return () => clearTimeout(timer)
  }, [q])

  // Update URL when filters change (including debounced search)
  useEffect(() => {
    updateURLParams({ 
      q: debouncedQ, 
      stage, 
      priority, 
      platform, 
      nextFrom, 
      nextTo, 
      followUpPreset, 
      statusFilter 
    })
  }, [debouncedQ, stage, priority, platform, nextFrom, nextTo, followUpPreset, statusFilter, updateURLParams])

  const fetchLeads = useCallback(async (opts?: Partial<{ page:number; limit:number }>) => {
    if (!canQuery) return
    const p = opts?.page ?? page
    const l = opts?.limit ?? limit
    setBusy(true)
    try {
      const data = await apiClient.getLeads({ q: debouncedQ, stage, priority, platform, nextFrom, nextTo, page: p, limit: l })
      setItems(data.items || [])
      setTotal(data.total || 0)
      setPage(data.page || p)
      setLimit(data.limit || l)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }, [canQuery, debouncedQ, stage, priority, platform, nextFrom, nextTo, page, limit])

  // Initial load and auto-apply filters when they change
  useEffect(() => {
    if (canQuery) {
      fetchLeads({ page: 1 })
    }
  }, [canQuery, debouncedQ, stage, priority, platform, nextFrom, nextTo, fetchLeads])

  const setDateRangeFromPreset = (preset: "all" | "today" | "tomorrow" | "yesterday" | "custom") => {
    if (preset === "all") {
      setNextFrom("")
      setNextTo("")
      return
    }
    if (preset === "custom") return
    const base = new Date()
    if (preset === "tomorrow") base.setDate(base.getDate() + 1)
    if (preset === "yesterday") base.setDate(base.getDate() - 1)
    const start = new Date(base)
    start.setHours(0, 0, 0, 0)
    const end = new Date(base)
    end.setHours(23, 59, 59, 999)
    setNextFrom(start.toISOString())
    setNextTo(end.toISOString())
  }

  const handleFollowUpPresetChange = (preset: "all" | "today" | "tomorrow" | "yesterday" | "custom") => {
    setFollowUpPreset(preset)
    setDateRangeFromPreset(preset)
  }

  const clearFilters = () => {
    setQ("")
    setDebouncedQ("")
    setStage("")
    setPriority("")
    setPlatform("")
    setFollowUpPreset("all")
    setStatusFilter("all")
    setDateRangeFromPreset("all")
    router.replace("/leads", { scroll: false })
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const filteredAndSortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const aTime = a.nextFollowUpDate ? new Date(a.nextFollowUpDate).getTime() : 0
      const bTime = b.nextFollowUpDate ? new Date(b.nextFollowUpDate).getTime() : 0
      return aTime - bTime
    })
    return sorted.filter((lead) => {
      if (statusFilter === "lost") return lead.stage === "Lost"
      if (statusFilter === "won") return lead.stage === "Won"
      if (statusFilter === "active") return lead.stage !== "Lost" && lead.stage !== "Won"
      return true
    })
  }, [items, statusFilter])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!createData.clientName?.trim()) newErrors.clientName = "Client name is required"
    if (createData.clientEmail && !/\S+@\S+\.\S+/.test(createData.clientEmail)) {
      newErrors.clientEmail = "Please enter a valid email address"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    
    try {
      setBusy(true)
      const payload = {
        ...createData,
        estimatedBudget: Number(createData.estimatedBudget || 0),
        tags: (createData.tags || []).filter(Boolean).map((t:string)=>t.trim())
      }
      await apiClient.createLead(payload)
      setShowCreate(false)
      setCreateData({
        clientName: "", projectDetails: "", clientEmail: "", clientMobile: "", companyName: "",
        priority: "Medium", estimatedBudget: 0, stage: "New", address: { city: "", country: "" },
        tags: [], platform: "", nextFollowUpDate: "", notes: ""
      })
      setErrors({})
      fetchLeads({ page: 1 })
    } catch (e:any) {
      setErrors({ submit: e?.message || "Failed to create lead" })
    } finally {
      setBusy(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "danger"
      case "Medium": return "warning"
      case "Low": return "secondary"
      default: return "secondary"
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Won": return "success"
      case "Lost": return "danger"
      case "In Discussion": return "info"
      case "Proposal Sent": return "purple"
      case "Negotiation": return "warning"
      default: return "secondary"
    }
  }

  // Statistics
  const wonLeads = items.filter(l => l.stage === "Won").length
  const activeLeads = items.filter(l => !["Won", "Lost"].includes(l.stage)).length
  const totalValue = items.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0)

  if (loading && !canQuery) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Lead Management</h1>
            <p className="text-gray-600 text-lg">
              Track and manage your sales pipeline effectively
            </p>
          </div>
          <ModernButton onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Lead
          </ModernButton>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Leads</ModernCardTitle>
                  <p className="text-white/80 text-sm">All time</p>
                </div>
                <Users className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{total}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Active Leads</ModernCardTitle>
                  <p className="text-gray-600 text-sm">In progress</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{activeLeads}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Won Leads</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Successful conversions</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{wonLeads}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Pipeline Value</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Estimated worth</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{totalValue.toLocaleString()}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="lg:col-span-2">
                <ModernInput
                  placeholder="Search client, notes, tags..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <ModernSelect
                label="Stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                options={[
                  { value: "", label: "All Stages" },
                  ...STAGES.map(s => ({ value: s, label: s }))
                ]}
              />
              <ModernSelect
                label="Follow-up"
                value={followUpPreset}
                onChange={(e) => handleFollowUpPresetChange(e.target.value as "all" | "today" | "tomorrow" | "yesterday" | "custom")}
                options={[
                  { value: "all", label: "All Dates" },
                  { value: "today", label: "Today" },
                  { value: "tomorrow", label: "Tomorrow" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "custom", label: "Custom Range" },
                ]}
              />
              <ModernSelect
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: "", label: "All Priorities" },
                  ...PRIORITIES.map(s => ({ value: s, label: s }))
                ]}
              />
              <ModernSelect
                label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                options={[
                  { value: "", label: "All Platforms" },
                  ...platforms.map(p => ({ value: p._id, label: p.name }))
                ]}
              />
              <ModernSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "lost" | "won")}
                options={[
                  { value: "all", label: "All Leads" },
                  { value: "active", label: "Active Leads" },
                  { value: "won", label: "Won Leads" },
                  { value: "lost", label: "Lost Leads" },
                ]}
              />
              {followUpPreset === "custom" && (
                <div className="flex flex-col gap-3 lg:col-span-2">
                  <div className="grid grid-cols-2 gap-3">
                    <ModernInput
                      label="From"
                      type="date"
                      value={nextFrom ? new Date(nextFrom).toISOString().slice(0, 10) : ""}
                      onChange={(e) => setNextFrom(e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : "")}
                    />
                    <ModernInput
                      label="To"
                      type="date"
                      value={nextTo ? new Date(nextTo).toISOString().slice(0, 10) : ""}
                      onChange={(e) => setNextTo(e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : "")}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <ModernButton variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear
                </ModernButton>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Leads Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">All Leads</ModernCardTitle>
              <div className="flex items-center gap-4">
                <ModernBadge variant="secondary">
                  {filteredAndSortedItems.length} of {total}
                </ModernBadge>
                <ModernButton variant="outline" onClick={() => fetchLeads()} disabled={busy}>
                  <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                  Refresh
                </ModernButton>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {busy ? "Loading leads..." : "No leads found"}
                </p>
                <p className="text-gray-400">
                  {total === 0 ? "Get started by creating your first lead" : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Client</ModernTableHead>
                    <ModernTableHead>Stage</ModernTableHead>
                    <ModernTableHead>Priority</ModernTableHead>
                    <ModernTableHead>Budget</ModernTableHead>
                    <ModernTableHead>Platform</ModernTableHead>
                    <ModernTableHead>Next Follow-Up</ModernTableHead>
                    <ModernTableHead>Updated</ModernTableHead>
                    <ModernTableHead className="text-right">Actions</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {filteredAndSortedItems.map((lead) => (
                    <ModernTableRow key={lead._id}>
                      <ModernTableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {lead.clientName?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{lead.clientName}</div>
                            <div className="text-sm text-gray-500">
                              {lead.clientEmail || lead.clientMobile || "—"}
                            </div>
                          </div>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge variant={getStageColor(lead.stage)}>
                          {lead.stage}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge variant={getPriorityColor(lead.priority)}>
                          {lead.priority}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="font-semibold">
                          {lead.estimatedBudget ? `₹${lead.estimatedBudget.toLocaleString()}` : "—"}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-gray-600">
                          {(typeof lead.platform === "object" && lead.platform?.name) || "—"}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-sm">
                          {formatDateDDMMYYYY(lead.nextFollowUpDate)}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="text-sm text-gray-500">
                          {formatDateDDMMYYYY(lead.updatedAt)}
                        </div>
                      </ModernTableCell>
                      <ModernTableCell className="text-right">
                        <Link 
                          href={`/leads/${lead._id}`}
                          onClick={() => {
                            // Store current URL with filters for back navigation
                            const currentUrl = window.location.pathname + window.location.search
                            sessionStorage.setItem('leadsPageUrl', currentUrl)
                          }}
                        >
                          <ModernButton variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                            Open
                          </ModernButton>
                        </Link>
                      </ModernTableCell>
                    </ModernTableRow>
                  ))}
                </ModernTableBody>
              </ModernTable>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <ModernButton
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => fetchLeads({ page: page - 1 })}
                  >
                    Previous
                  </ModernButton>
                  <span className="text-sm text-gray-600">
                    {page} of {totalPages}
                  </span>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => fetchLeads({ page: page + 1 })}
                  >
                    Next
                  </ModernButton>
                </div>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Create Lead Modal */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create New Lead</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {errors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Client Name"
                  value={createData.clientName}
                  onChange={(e) => setCreateData((s:any) => ({...s, clientName: e.target.value}))}
                  placeholder="Enter client name"
                  icon={<Users className="h-4 w-4" />}
                  error={errors.clientName}
                />

                <ModernInput
                  label="Company Name"
                  value={createData.companyName}
                  onChange={(e) => setCreateData((s:any) => ({...s, companyName: e.target.value}))}
                  placeholder="Enter company name"
                  icon={<Building2 className="h-4 w-4" />}
                />

                <ModernInput
                  label="Email Address"
                  type="email"
                  value={createData.clientEmail}
                  onChange={(e) => setCreateData((s:any) => ({...s, clientEmail: e.target.value}))}
                  placeholder="Enter email address"
                  icon={<Mail className="h-4 w-4" />}
                  error={errors.clientEmail}
                />

                <ModernInput
                  label="Mobile Number"
                  value={createData.clientMobile}
                  onChange={(e) => setCreateData((s:any) => ({...s, clientMobile: e.target.value}))}
                  placeholder="Enter mobile number"
                  icon={<Phone className="h-4 w-4" />}
                />

                <ModernSelect
                  label="Stage"
                  value={createData.stage}
                  onChange={(e) => setCreateData((s:any) => ({...s, stage: e.target.value}))}
                  options={STAGES.map(s => ({ value: s, label: s }))}
                />

                <ModernSelect
                  label="Priority"
                  value={createData.priority}
                  onChange={(e) => setCreateData((s:any) => ({...s, priority: e.target.value}))}
                  options={PRIORITIES.map(s => ({ value: s, label: s }))}
                />

                <ModernInput
                  label="Estimated Budget"
                  type="number"
                  value={createData.estimatedBudget}
                  onChange={(e) => setCreateData((s:any) => ({...s, estimatedBudget: e.target.value}))}
                  placeholder="Enter estimated budget"
                  icon={<DollarSign className="h-4 w-4" />}
                />

                <ModernSelect
                  label="Platform"
                  value={createData.platform}
                  onChange={(e) => setCreateData((s:any) => ({...s, platform: e.target.value}))}
                  options={[
                    { value: "", label: "Select Platform" },
                    ...platforms.map(p => ({ value: p._id, label: p.name }))
                  ]}
                />

                <ModernInput
                  label="City"
                  value={createData.address.city}
                  onChange={(e) => setCreateData((s:any) => ({...s, address: {...s.address, city: e.target.value}}))}
                  placeholder="Enter city"
                  icon={<MapPin className="h-4 w-4" />}
                />

                <ModernInput
                  label="Country"
                  value={createData.address.country}
                  onChange={(e) => setCreateData((s:any) => ({...s, address: {...s.address, country: e.target.value}}))}
                  placeholder="Enter country"
                  icon={<MapPin className="h-4 w-4" />}
                />

                <ModernInput
                  label="Tags"
                  value={(createData.tags || []).join(", ")}
                  onChange={(e) => setCreateData((s:any) => ({...s, tags: e.target.value.split(",").map((x:string) => x.trim()).filter(Boolean)}))}
                  placeholder="Enter tags (comma separated)"
                  icon={<Tag className="h-4 w-4" />}
                />

                <ModernInput
                  label="Next Follow-Up"
                  type="datetime-local"
                  value={createData.nextFollowUpDate}
                  onChange={(e) => setCreateData((s:any) => ({...s, nextFollowUpDate: e.target.value}))}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-4">
                <ModernInput
                  label="Project Details"
                  value={createData.projectDetails}
                  onChange={(e) => setCreateData((s:any) => ({...s, projectDetails: e.target.value}))}
                  placeholder="Describe the project requirements and scope"
                />

                <ModernInput
                  label="Internal Notes"
                  value={createData.notes}
                  onChange={(e) => setCreateData((s:any) => ({...s, notes: e.target.value}))}
                  placeholder="Add any internal notes or observations"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <ModernButton onClick={handleCreate} loading={busy} className="flex-1">
                  Create Lead
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    setCreateData({
                      clientName: "", projectDetails: "", clientEmail: "", clientMobile: "", companyName: "",
                      priority: "Medium", estimatedBudget: 0, stage: "New", address: { city: "", country: "" },
                      tags: [], platform: "", nextFollowUpDate: "", notes: ""
                    })
                    setErrors({})
                  }}
                  className="flex-1"
                >
                  Cancel
                </ModernButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModernMainLayout>
  )
}

export default function ModernLeadsPage() {
  return (
    <Suspense fallback={
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
          <LoadingSkeleton variant="card" height={400} />
        </div>
      </ModernMainLayout>
    }>
      <LeadsPageContent />
    </Suspense>
  )
}