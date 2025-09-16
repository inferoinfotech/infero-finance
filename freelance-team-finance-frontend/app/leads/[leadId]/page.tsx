"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import type { Lead } from "@/types/lead"
import Link from "next/link"
import { 
  Save, 
  ChevronLeft, 
  Trash2, 
  Plus, 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  Calendar, 
  DollarSign,
  MessageSquare,
  Clock,
  User
} from "lucide-react"

const STAGES = ["New","Contacted","In Discussion","Proposal Sent","Negotiation","Won","Lost","On Hold","No Reply"]
const PRIORITIES = ["High","Medium","Low"]

export default function ModernLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [platforms, setPlatforms] = useState<{_id:string; name:string}[]>([])
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // follow-up form
  const [fu, setFu] = useState({ date: "", clientResponse: "", notes: "", nextFollowUpDate: "" })
  const [fuErrors, setFuErrors] = useState<Record<string, string>>({})

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
        address: data.lead.address || { city:"", country:"" },
        tags: data.lead.tags || [],
        nextFollowUpDate: data.lead.nextFollowUpDate ? new Date(data.lead.nextFollowUpDate).toISOString().slice(0,16) : "",
        notes: data.lead.notes || ""
      })
    } catch (e) { 
      console.error(e)
      setErrors({ fetch: "Failed to load lead details" })
    }
  }

  useEffect(() => {
    (async () => {
      try { 
        const { platforms } = await apiClient.getPlatforms()
        setPlatforms(platforms||[]) 
      } catch {}
      fetchLead()
    })()
  }, [leadId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!edit.clientName?.trim()) newErrors.clientName = "Client name is required"
    if (edit.clientEmail && !/\S+@\S+\.\S+/.test(edit.clientEmail)) {
      newErrors.clientEmail = "Please enter a valid email address"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const updateLead = async () => {
    if (!validateForm()) return
    
    try {
      setBusy(true)
      const payload = {
        ...edit,
        estimatedBudget: Number(edit.estimatedBudget || 0),
      }
      await apiClient.updateLead(leadId, payload)
      await fetchLead()
      setErrors({})
    } catch (e:any) { 
      setErrors({ submit: e?.message || "Failed to update lead" })
    } finally { 
      setBusy(false) 
    }
  }

  const deleteLead = async () => {
    if (!confirm("Delete this lead permanently? This action cannot be undone.")) return
    try {
      await apiClient.deleteLead(leadId)
      router.replace("/leads")
    } catch (e:any) { 
      setErrors({ delete: e?.message || "Delete failed" })
    }
  }

  const validateFollowUp = () => {
    const newErrors: Record<string, string> = {}
    if (!fu.date) newErrors.date = "Follow-up date/time is required"
    setFuErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addFollowUp = async () => {
    if (!validateFollowUp()) return
    
    try {
      setBusy(true)
      await apiClient.addFollowUp(leadId, {
        date: new Date(fu.date).toISOString(),
        clientResponse: fu.clientResponse,
        notes: fu.notes,
        nextFollowUpDate: fu.nextFollowUpDate ? new Date(fu.nextFollowUpDate).toISOString() : undefined
      })
      setFu({ date:"", clientResponse:"", notes:"", nextFollowUpDate:"" })
      setFuErrors({})
      await fetchLead()
    } catch (e:any) { 
      setFuErrors({ submit: e?.message || "Failed to add follow-up" })
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

  if (!lead && !errors.fetch) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <LoadingSkeleton width={400} height={40} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <LoadingSkeleton variant="card" height={600} />
            </div>
            <LoadingSkeleton variant="card" height={600} />
          </div>
        </div>
      </ModernMainLayout>
    )
  }

  if (errors.fetch) {
    return (
      <ModernMainLayout>
        <ModernCard>
          <ModernCardContent className="py-12 text-center">
            <div className="text-red-500 text-lg font-medium">Failed to load lead</div>
            <p className="text-gray-500 mt-2">Please try refreshing the page</p>
          </ModernCardContent>
        </ModernCard>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/leads">
              <ModernButton variant="outline">
                <ChevronLeft className="h-4 w-4" />
                Back to Leads
              </ModernButton>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{lead?.clientName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <ModernBadge variant={getStageColor(lead?.stage || "")}>
                  {lead?.stage}
                </ModernBadge>
                <ModernBadge variant={getPriorityColor(lead?.priority || "")}>
                  {lead?.priority} Priority
                </ModernBadge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {errors.submit && (
              <div className="text-red-500 text-sm">{errors.submit}</div>
            )}
            {errors.delete && (
              <div className="text-red-500 text-sm">{errors.delete}</div>
            )}
            <ModernButton
              variant="outline"
              onClick={deleteLead}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ModernButton>
            <ModernButton onClick={updateLead} loading={busy}>
              <Save className="h-4 w-4" />
              Save Changes
            </ModernButton>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left: Edit Form */}
          <div className="xl:col-span-2 space-y-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Lead Information</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModernInput
                    label="Client Name"
                    value={edit?.clientName || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, clientName: e.target.value}))}
                    placeholder="Enter client name"
                    icon={<Users className="h-4 w-4" />}
                    error={errors.clientName}
                  />

                  <ModernInput
                    label="Company Name"
                    value={edit?.companyName || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, companyName: e.target.value}))}
                    placeholder="Enter company name"
                    icon={<Building2 className="h-4 w-4" />}
                  />

                  <ModernInput
                    label="Email Address"
                    type="email"
                    value={edit?.clientEmail || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, clientEmail: e.target.value}))}
                    placeholder="Enter email address"
                    icon={<Mail className="h-4 w-4" />}
                    error={errors.clientEmail}
                  />

                  <ModernInput
                    label="Mobile Number"
                    value={edit?.clientMobile || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, clientMobile: e.target.value}))}
                    placeholder="Enter mobile number"
                    icon={<Phone className="h-4 w-4" />}
                  />

                  <ModernSelect
                    label="Stage"
                    value={edit?.stage || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, stage: e.target.value}))}
                    options={STAGES.map(s => ({ value: s, label: s }))}
                  />

                  <ModernSelect
                    label="Priority"
                    value={edit?.priority || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, priority: e.target.value}))}
                    options={PRIORITIES.map(s => ({ value: s, label: s }))}
                  />

                  <ModernInput
                    label="Estimated Budget"
                    type="number"
                    value={edit?.estimatedBudget || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, estimatedBudget: e.target.value}))}
                    placeholder="Enter estimated budget"
                    icon={<DollarSign className="h-4 w-4" />}
                  />

                  <ModernSelect
                    label="Platform"
                    value={edit?.platform || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, platform: e.target.value}))}
                    options={[
                      { value: "", label: "Select Platform" },
                      ...platforms.map(p => ({ value: p._id, label: p.name }))
                    ]}
                  />

                  <ModernInput
                    label="City"
                    value={edit?.address?.city || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, address: {...s.address, city: e.target.value}}))}
                    placeholder="Enter city"
                    icon={<MapPin className="h-4 w-4" />}
                  />

                  <ModernInput
                    label="Country"
                    value={edit?.address?.country || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, address: {...s.address, country: e.target.value}}))}
                    placeholder="Enter country"
                    icon={<MapPin className="h-4 w-4" />}
                  />

                  <ModernInput
                    label="Tags"
                    value={(edit?.tags || []).join(", ")}
                    onChange={(e) => setEdit((s:any) => ({...s, tags: e.target.value.split(",").map((x:string) => x.trim()).filter(Boolean)}))}
                    placeholder="Enter tags (comma separated)"
                    icon={<Tag className="h-4 w-4" />}
                  />

                  <ModernInput
                    label="Next Follow-Up"
                    type="datetime-local"
                    value={edit?.nextFollowUpDate || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, nextFollowUpDate: e.target.value}))}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-4">
                  <ModernInput
                    label="Project Details"
                    value={edit?.projectDetails || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, projectDetails: e.target.value}))}
                    placeholder="Describe the project requirements and scope"
                  />

                  <ModernInput
                    label="Internal Notes"
                    value={edit?.notes || ""}
                    onChange={(e) => setEdit((s:any) => ({...s, notes: e.target.value}))}
                    placeholder="Add any internal notes or observations"
                  />
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>

          {/* Right: Follow-ups */}
          <div className="space-y-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Add Follow-up</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-4">
                {fuErrors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {fuErrors.submit}
                  </div>
                )}

                <ModernInput
                  label="Follow-up Date & Time"
                  type="datetime-local"
                  value={fu.date}
                  onChange={(e) => setFu(s => ({...s, date: e.target.value}))}
                  icon={<Calendar className="h-4 w-4" />}
                  error={fuErrors.date}
                />

                <ModernInput
                  label="Client Response"
                  value={fu.clientResponse}
                  onChange={(e) => setFu(s => ({...s, clientResponse: e.target.value}))}
                  placeholder="What did the client say?"
                  icon={<MessageSquare className="h-4 w-4" />}
                />

                <ModernInput
                  label="Notes"
                  value={fu.notes}
                  onChange={(e) => setFu(s => ({...s, notes: e.target.value}))}
                  placeholder="Additional notes about this follow-up"
                />

                <ModernInput
                  label="Next Follow-up Date"
                  type="datetime-local"
                  value={fu.nextFollowUpDate}
                  onChange={(e) => setFu(s => ({...s, nextFollowUpDate: e.target.value}))}
                  icon={<Calendar className="h-4 w-4" />}
                />

                <ModernButton onClick={addFollowUp} loading={busy} className="w-full">
                  <Plus className="h-4 w-4" />
                  Add Follow-up
                </ModernButton>
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Follow-up History</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                {(lead?.followUps || []).length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No follow-ups yet</p>
                    <p className="text-gray-400 text-sm">Add your first follow-up above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(lead?.followUps || []).slice().reverse().map((f, idx) => (
                      <div key={idx} className="border-l-4 border-blue-200 pl-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(f.date).toLocaleString()}
                          </span>
                        </div>
                        {f.clientResponse && (
                          <div className="font-medium text-gray-900 mb-1">
                            "{f.clientResponse}"
                          </div>
                        )}
                        {f.notes && (
                          <div className="text-gray-600 text-sm mb-2">{f.notes}</div>
                        )}
                        {typeof f.addedBy === "object" && f.addedBy && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            by {(f.addedBy as any).name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>
      </div>
    </ModernMainLayout>
  )
}