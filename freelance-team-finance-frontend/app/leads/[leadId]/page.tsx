"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { apiClient } from "@/lib/api"
import type { Lead } from "@/types/lead"
import Link from "next/link"
import { Save, ChevronLeft, Trash2, Plus } from "lucide-react"
import { ModernMainLayout } from "@/components/modern-main-layout"

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

export default function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [platforms, setPlatforms] = useState<{ _id: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<any>(null)

  // follow-up form
  const [fu, setFu] = useState({ date: "", clientResponse: "", notes: "", nextFollowUpDate: "" })

  const fetchLead = async () => {
    try {
      const data = await apiClient.getLead(leadId)
      setLead(data.lead)
      setEdit({
        clientName: data.lead.clientName || "",
        companyName: data.lead.companyName || "",
        clientEmail: data.lead.clientEmail || "",
        clientMobile: data.lead.clientMobile || "",
        projectDetails: data.lead.projectDetails || "",
        priority: data.lead.priority || "Medium",
        estimatedBudget: data.lead.estimatedBudget || 0,
        stage: data.lead.stage || "New",
        platform: typeof data.lead.platform === "object" ? data.lead.platform?._id : data.lead.platform || "",
        address: data.lead.address || { city: "", country: "" },
        tags: data.lead.tags || [],
        nextFollowUpDate: data.lead.nextFollowUpDate
          ? new Date(data.lead.nextFollowUpDate).toISOString().slice(0, 16)
          : "",
        notes: data.lead.notes || "",
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { platforms } = await apiClient.getPlatforms()
        setPlatforms(platforms || [])
      } catch {}
      fetchLead()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const updateLead = async () => {
    try {
      setBusy(true)
      const payload = {
        ...edit,
        estimatedBudget: Number(edit.estimatedBudget || 0),
      }
      await apiClient.updateLead(leadId, payload)
      await fetchLead()
    } catch (e: any) {
      alert(e?.message || "Failed to update")
    } finally {
      setBusy(false)
    }
  }

  const deleteLead = async () => {
    if (!confirm("Delete this lead permanently?")) return
    try {
      await apiClient.deleteLead(leadId)
      router.replace("/leads")
    } catch (e: any) {
      alert(e?.message || "Delete failed")
    }
  }

  const addFollowUp = async () => {
    if (!fu.date) {
      alert("Follow-up date/time is required")
      return
    }
    try {
      setBusy(true)
      await apiClient.addFollowUp(leadId, {
        date: new Date(fu.date).toISOString(),
        clientResponse: fu.clientResponse,
        notes: fu.notes,
        nextFollowUpDate: fu.nextFollowUpDate ? new Date(fu.nextFollowUpDate).toISOString() : undefined,
      })
      setFu({ date: "", clientResponse: "", notes: "", nextFollowUpDate: "" })
      await fetchLead()
    } catch (e: any) {
      alert(e?.message || "Failed to add follow-up")
    } finally {
      setBusy(false)
    }
  }

  if (!lead) {
    return (
      <ModernMainLayout>
        <div className="text-gray-500">Loading...</div>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/leads" className="inline-flex items-center gap-1 px-3 py-1 rounded border hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl font-semibold">{lead.clientName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteLead}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button
            onClick={updateLead}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: edit form */}
        <div className="xl:col-span-2 bg-white rounded shadow p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Client Name *"
              value={edit.clientName}
              onChange={(e) => setEdit((s: any) => ({ ...s, clientName: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Company"
              value={edit.companyName}
              onChange={(e) => setEdit((s: any) => ({ ...s, companyName: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={edit.clientEmail}
              onChange={(e) => setEdit((s: any) => ({ ...s, clientEmail: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Mobile"
              value={edit.clientMobile}
              onChange={(e) => setEdit((s: any) => ({ ...s, clientMobile: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={edit.stage}
              onChange={(e) => setEdit((s: any) => ({ ...s, stage: e.target.value }))}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="border rounded px-3 py-2"
              value={edit.priority}
              onChange={(e) => setEdit((s: any) => ({ ...s, priority: e.target.value }))}
            >
              {PRIORITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="border rounded px-3 py-2"
              placeholder="Estimated Budget"
              type="number"
              value={edit.estimatedBudget}
              onChange={(e) => setEdit((s: any) => ({ ...s, estimatedBudget: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={edit.platform}
              onChange={(e) => setEdit((s: any) => ({ ...s, platform: e.target.value }))}
            >
              <option value="">Select Platform</option>
              {platforms.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              className="border rounded px-3 py-2"
              placeholder="City"
              value={edit.address?.city || ""}
              onChange={(e) => setEdit((s: any) => ({ ...s, address: { ...s.address, city: e.target.value } }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Country"
              value={edit.address?.country || ""}
              onChange={(e) => setEdit((s: any) => ({ ...s, address: { ...s.address, country: e.target.value } }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Tags (comma separated)"
              value={(edit.tags || []).join(", ")}
              onChange={(e) =>
                setEdit((s: any) => ({
                  ...s,
                  tags: e.target.value
                    .split(",")
                    .map((x: string) => x.trim())
                    .filter(Boolean),
                }))
              }
            />
            <input
              className="border rounded px-3 py-2"
              type="datetime-local"
              value={edit.nextFollowUpDate}
              onChange={(e) => setEdit((s: any) => ({ ...s, nextFollowUpDate: e.target.value }))}
            />
          </div>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={4}
            placeholder="Project Details / Notes"
            value={edit.projectDetails}
            onChange={(e) => setEdit((s: any) => ({ ...s, projectDetails: e.target.value }))}
          />
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            placeholder="Internal Notes"
            value={edit.notes}
            onChange={(e) => setEdit((s: any) => ({ ...s, notes: e.target.value }))}
          />
        </div>

        {/* Right: Follow-ups */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Follow-ups</h3>

          <div className="space-y-2 mb-4">
            <input
              type="datetime-local"
              className="border rounded px-3 py-2 w-full"
              value={fu.date}
              onChange={(e) => setFu((s) => ({ ...s, date: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Client response"
              value={fu.clientResponse}
              onChange={(e) => setFu((s) => ({ ...s, clientResponse: e.target.value }))}
            />
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows={2}
              placeholder="Notes"
              value={fu.notes}
              onChange={(e) => setFu((s) => ({ ...s, notes: e.target.value }))}
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Set next follow-up date</label>
              <input
                type="datetime-local"
                className="border rounded px-3 py-2 w-full"
                value={fu.nextFollowUpDate}
                onChange={(e) => setFu((s) => ({ ...s, nextFollowUpDate: e.target.value }))}
              />
            </div>
            <button
              onClick={addFollowUp}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" /> Add Follow-up
            </button>
          </div>

          <div className="divide-y">
            {(lead.followUps || [])
              .slice()
              .reverse()
              .map((f, idx) => (
                <div key={idx} className="py-3">
                  <div className="text-sm text-gray-600">{new Date(f.date).toLocaleString()}</div>
                  <div className="font-medium">{f.clientResponse || "-"}</div>
                  {f.notes ? <div className="text-gray-600">{f.notes}</div> : null}
                  {typeof f.addedBy === "object" && f.addedBy ? (
                    <div className="text-xs text-gray-500 mt-1">by {(f.addedBy as any).name}</div>
                  ) : null}
                </div>
              ))}
            {!lead.followUps?.length && <div className="text-gray-500 text-sm py-2">No follow-ups yet.</div>}
          </div>
        </div>
      </div>
    </ModernMainLayout>
  )
}
