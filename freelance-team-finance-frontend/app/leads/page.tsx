"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { apiClient } from "@/lib/api"
import type { Lead } from "@/types/lead"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Plus, Search, Filter, RefreshCcw, X } from "lucide-react"

const STAGES = ["New","Contacted","In Discussion","Proposal Sent","Negotiation","Won","Lost","On Hold","No Reply"]
const PRIORITIES = ["High","Medium","Low"]

export default function LeadsPage() {
  const { token, loading } = useAuth()
  const [items, setItems] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [busy, setBusy] = useState(false)

  const [platforms, setPlatforms] = useState<{_id:string; name:string}[]>([])

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
    notes: ""
  })

  const canQuery = useMemo(() => !!token && !loading, [token, loading])

  useEffect(() => {
    (async () => {
      try {
        const { platforms } = await apiClient.getPlatforms()
        setPlatforms(platforms || [])
      } catch {}
    })()
  }, [])

  const fetchLeads = async (opts?: Partial<{ page:number; limit:number }>) => {
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

  useEffect(() => { fetchLeads({ page:1 }) }, [canQuery]) // initial

  const clearFilters = () => {
    setQ(""); setStage(""); setPriority(""); setPlatform(""); setNextFrom(""); setNextTo("")
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleCreate = async () => {
    try {
      setBusy(true)
      const payload = {
        ...createData,
        estimatedBudget: Number(createData.estimatedBudget || 0),
        tags: (createData.tags || []).filter(Boolean).map((t:string)=>t.trim())
      }
      if (!payload.clientName?.trim()) { alert("Client name is required"); setBusy(false); return }
      await apiClient.createLead(payload)
      setShowCreate(false)
      // reset
      setCreateData({
        clientName: "", projectDetails: "", clientEmail: "", clientMobile: "", companyName: "",
        priority: "Medium", estimatedBudget: 0, stage: "New", address: { city: "", country: "" },
        tags: [], platform: "", nextFollowUpDate: "", notes: ""
      })
      fetchLeads({ page: 1 })
    } catch (e:any) {
      alert(e?.message || "Failed to create lead")
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <button
          onClick={()=>setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-md shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="col-span-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Search client, notes, tags..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stage</label>
            <select value={stage} onChange={e=>setStage(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">All</option>
              {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Priority</label>
            <select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">All</option>
              {PRIORITIES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Platform</label>
            <select value={platform} onChange={e=>setPlatform(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">All</option>
              {platforms.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Next From</label>
              <input type="date" value={nextFrom} onChange={e=>setNextFrom(e.target.value)} className="border rounded px-3 py-2"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Next To</label>
              <input type="date" value={nextTo} onChange={e=>setNextTo(e.target.value)} className="border rounded px-3 py-2"/>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={()=>fetchLeads({ page:1 })}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-black">
            <Filter className="h-4 w-4" /> Apply
          </button>
          <button onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border hover:bg-gray-50">
            <X className="h-4 w-4" /> Clear
          </button>
          <button onClick={()=>fetchLeads()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border hover:bg-gray-50 ml-auto">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Budget</th>
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-left px-4 py-3">Next Follow-Up</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(lead => (
                <tr key={lead._id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{lead.clientName}</div>
                    <div className="text-gray-500">{lead.clientEmail || lead.clientMobile || "-"}</div>
                  </td>
                  <td className="px-4 py-3">{lead.stage}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs
                      ${lead.priority==="High"?"bg-red-100 text-red-700":
                         lead.priority==="Low"?"bg-gray-100 text-gray-700":"bg-yellow-100 text-yellow-800"}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lead.estimatedBudget ? `₹ ${lead.estimatedBudget.toLocaleString()}` : "-"}</td>
                  <td className="px-4 py-3">{(typeof lead.platform === "object" && lead.platform?.name) || "-"}</td>
                  <td className="px-4 py-3">{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead._id}`} className="text-blue-600 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  {busy ? "Loading..." : "No leads found."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-sm">
          <div>Total: {total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>fetchLeads({ page: page-1 })}
              className={`px-3 py-1 rounded border ${page<=1?"opacity-50":""}`}>Prev</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page>=totalPages} onClick={()=>fetchLeads({ page: page+1 })}
              className={`px-3 py-1 rounded border ${page>=totalPages?"opacity-50":""}`}>Next</button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create Lead</h2>
              <button onClick={()=>setShowCreate(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-5 w-5"/>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Client Name *"
                value={createData.clientName} onChange={e=>setCreateData((s:any)=>({...s, clientName:e.target.value}))}/>
              <input className="border rounded px-3 py-2" placeholder="Company"
                value={createData.companyName} onChange={e=>setCreateData((s:any)=>({...s, companyName:e.target.value}))}/>
              <input className="border rounded px-3 py-2" placeholder="Email"
                value={createData.clientEmail} onChange={e=>setCreateData((s:any)=>({...s, clientEmail:e.target.value}))}/>
              <input className="border rounded px-3 py-2" placeholder="Mobile"
                value={createData.clientMobile} onChange={e=>setCreateData((s:any)=>({...s, clientMobile:e.target.value}))}/>
              <select className="border rounded px-3 py-2" value={createData.stage}
                onChange={e=>setCreateData((s:any)=>({...s, stage:e.target.value}))}>
                {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select className="border rounded px-3 py-2" value={createData.priority}
                onChange={e=>setCreateData((s:any)=>({...s, priority:e.target.value}))}>
                {PRIORITIES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <input className="border rounded px-3 py-2" placeholder="Estimated Budget"
                type="number" value={createData.estimatedBudget}
                onChange={e=>setCreateData((s:any)=>({...s, estimatedBudget:e.target.value}))}/>
              <select className="border rounded px-3 py-2" value={createData.platform}
                onChange={e=>setCreateData((s:any)=>({...s, platform:e.target.value}))}>
                <option value="">Select Platform</option>
                {platforms.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <input className="border rounded px-3 py-2" placeholder="City"
                value={createData.address.city} onChange={e=>setCreateData((s:any)=>({...s, address:{...s.address, city:e.target.value}}))}/>
              <input className="border rounded px-3 py-2" placeholder="Country"
                value={createData.address.country} onChange={e=>setCreateData((s:any)=>({...s, address:{...s.address, country:e.target.value}}))}/>
              <input className="border rounded px-3 py-2" placeholder="Tags (comma separated)"
                value={(createData.tags || []).join(", ")}
                onChange={e=>setCreateData((s:any)=>({...s, tags:e.target.value.split(",").map((x)=>x.trim()).filter(Boolean)}))}/>
              <input className="border rounded px-3 py-2" type="datetime-local"
                value={createData.nextFollowUpDate}
                onChange={e=>setCreateData((s:any)=>({...s, nextFollowUpDate:e.target.value}))}/>
              <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Project Details / Notes"
                rows={3} value={createData.projectDetails}
                onChange={e=>setCreateData((s:any)=>({...s, projectDetails:e.target.value}))}/>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={()=>setShowCreate(false)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                {busy ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
