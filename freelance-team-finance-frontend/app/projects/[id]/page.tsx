"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateDDMMYYYY } from "@/lib/utils"
import Link from "next/link"
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  DollarSign, 
  Calendar, 
  Globe, 
  Clock, 
  TrendingUp, 
  CreditCard,
  User,
  FileText,
  Trash2
} from "lucide-react"
import { PaymentList } from "@/components/payments/payment-list"
import { AddPaymentModal } from "@/components/payments/add-payment-modal"
import { AddHourlyWorkModal, HourlyWorkLog } from "@/components/hourly-work/add-hourly-work-modal"

interface Platform { _id: string; name: string }
interface Project {
  _id: string; name: string; clientName: string; platform: Platform | string
  currency: string; status: string; startDate?: string; endDate?: string
  priceType: string; fixedPrice?: number; hourlyRate?: number
  platformCharge: number; conversionRate: number
}

interface Payment {
  _id: string; amount: number; currency: string; amountInINR: number
  paymentDate: string; walletStatus: string; bankStatus: string; notes: string
}

export default function ModernProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [hourlyWork, setHourlyWork] = useState<HourlyWorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showAddHours, setShowAddHours] = useState(false)
  const [editLog, setEditLog] = useState<HourlyWorkLog | null>(null)

  useEffect(() => {
    if (params.id) fetchProjectDetails()
  }, [params.id])

  const fetchProjectDetails = async () => {
    setLoading(true)
    try {
      const [projectDataRaw, paymentsDataRaw] = await Promise.all([
        apiClient.getProject(params.id as string),
        apiClient.getProjectPayments(params.id as string)
      ])
      const projectData = projectDataRaw.project ? projectDataRaw.project : projectDataRaw
      setProject(projectData)
      setPayments(Array.isArray(paymentsDataRaw) ? paymentsDataRaw : (paymentsDataRaw.payments || []))
      
      if (projectData.priceType === "hourly") {
        const logs = await apiClient.getHourlyWorkEntries(projectData._id)
        setHourlyWork(Array.isArray(logs) ? logs : [])
      } else {
        setHourlyWork([])
      }
    } catch (error) {
      console.error("Failed to fetch project details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm("Delete this week log? This action cannot be undone.")) return
    try {
      await apiClient.deleteHourlyWork(logId)
      fetchProjectDetails()
    } catch (e) {
      alert("Delete failed!")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working": return "info"
      case "completed": return "success"
      case "paused": return "warning"
      case "cancelled": return "danger"
      case "pending": return "secondary"
      default: return "secondary"
    }
  }

  const getPlatformName = () =>
    typeof project?.platform === "object" && project.platform !== null
      ? project.platform.name
      : project?.platform || "—"

  const totalEarned = Array.isArray(payments)
    ? payments.reduce((sum, payment) => sum + (payment.amountInINR || 0), 0)
    : 0

  const totalHours = hourlyWork.reduce((sum, log) => sum + log.hours, 0)
  const billedHours = hourlyWork.filter(log => log.billed).reduce((sum, log) => sum + log.hours, 0)

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <LoadingSkeleton width={100} height={40} />
            <LoadingSkeleton width={300} height={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
          <LoadingSkeleton variant="card" height={400} />
        </div>
      </ModernMainLayout>
    )
  }

  if (!project) {
    return (
      <ModernMainLayout>
        <ModernCard>
          <ModernCardContent className="py-16 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h3>
            <p className="text-gray-500">The project you're looking for doesn't exist</p>
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
            <Link href="/projects">
              <ModernButton variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </ModernButton>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600 text-lg">{project.clientName}</p>
                <ModernBadge variant={getStatusColor(project.status)} className="capitalize">
                  {project.status}
                </ModernBadge>
              </div>
            </div>
          </div>
          <Link href={`/projects/${project._id}/edit`}>
            <ModernButton>
              <Edit className="h-4 w-4" />
              Edit Project
            </ModernButton>
          </Link>
        </div>

        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total Earned</ModernCardTitle>
                  <p className="text-white/80 text-sm">All payments</p>
                </div>
                <DollarSign className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">₹{totalEarned.toLocaleString()}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Payments</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Total count</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
            </ModernCardContent>
          </ModernCard>

          {project.priceType === "hourly" && (
            <>
              <ModernCard>
                <ModernCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <ModernCardTitle className="text-lg">Total Hours</ModernCardTitle>
                      <p className="text-gray-600 text-sm">Logged time</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                </ModernCardHeader>
                <ModernCardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalHours}h</div>
                </ModernCardContent>
              </ModernCard>

              <ModernCard>
                <ModernCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <ModernCardTitle className="text-lg">Billed Hours</ModernCardTitle>
                      <p className="text-gray-600 text-sm">Invoiced time</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </ModernCardHeader>
                <ModernCardContent>
                  <div className="text-2xl font-bold text-gray-900">{billedHours}h</div>
                </ModernCardContent>
              </ModernCard>
            </>
          )}
        </div>

        {/* Project Information */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="text-xl">Project Information</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">Platform</span>
                </div>
                <p className="text-gray-900 font-semibold">{getPlatformName()}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Currency</span>
                </div>
                <p className="text-gray-900 font-semibold">{project.currency}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Price Type</span>
                </div>
                <p className="text-gray-900 font-semibold capitalize">{project.priceType}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Rate</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {project.priceType === "fixed" && project.fixedPrice !== undefined
                    ? `${project.currency} ${project.fixedPrice.toLocaleString()}`
                    : project.priceType === "hourly" && project.hourlyRate !== undefined
                      ? `${project.currency} ${project.hourlyRate}/hr`
                      : "—"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Start Date</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {formatDateDDMMYYYY(project.startDate)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">End Date</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {project.endDate ? formatDateDDMMYYYY(project.endDate) : "Ongoing"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Platform Charge</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {project.platformCharge !== undefined ? `${project.platformCharge}%` : "—"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Conversion Rate</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {project.conversionRate !== undefined ? project.conversionRate : "—"}
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Payments Section */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">Payment History</ModernCardTitle>
              <ModernButton onClick={() => setShowAddPayment(true)}>
                <Plus className="h-4 w-4" />
                Add Payment
              </ModernButton>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <PaymentList payments={payments} onPaymentUpdate={fetchProjectDetails} />
          </ModernCardContent>
        </ModernCard>

        <AddPaymentModal
          projectId={params.id as string}
          isOpen={showAddPayment}
          onClose={() => setShowAddPayment(false)}
          onSuccess={fetchProjectDetails}
        />

        {/* Hourly Work Section */}
        {project.priceType === "hourly" && (
          <ModernCard>
            <ModernCardHeader>
              <div className="flex items-center justify-between">
                <ModernCardTitle className="text-xl">Weekly Hour Logs</ModernCardTitle>
                <ModernButton onClick={() => { setEditLog(null); setShowAddHours(true) }}>
                  <Plus className="h-4 w-4" />
                  Add Week
                </ModernButton>
              </div>
            </ModernCardHeader>
            <ModernCardContent className="p-0">
              {hourlyWork.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No week logs yet</p>
                  <p className="text-gray-400">Start tracking your weekly hours</p>
                </div>
              ) : (
                <ModernTable>
                  <ModernTableHeader>
                    <ModernTableRow>
                      <ModernTableHead>Week Start</ModernTableHead>
                      <ModernTableHead>Hours</ModernTableHead>
                      <ModernTableHead>User</ModernTableHead>
                      <ModernTableHead>Status</ModernTableHead>
                      <ModernTableHead className="text-right">Actions</ModernTableHead>
                    </ModernTableRow>
                  </ModernTableHeader>
                  <ModernTableBody>
                    {hourlyWork.map(log => (
                      <ModernTableRow key={log._id}>
                        <ModernTableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              {formatDateDDMMYYYY(log.weekStart)}
                            </span>
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold">{log.hours}h</span>
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{log.user?.name || "—"}</span>
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <ModernBadge variant={log.billed ? "success" : "warning"}>
                            {log.billed ? "Billed" : "Unbilled"}
                          </ModernBadge>
                        </ModernTableCell>
                        <ModernTableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <ModernButton
                              variant="outline"
                              size="sm"
                              onClick={() => { setEditLog(log); setShowAddHours(true) }}
                            >
                              <Edit className="h-4 w-4" />
                            </ModernButton>
                            <ModernButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLog(log._id)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ModernButton>
                          </div>
                        </ModernTableCell>
                      </ModernTableRow>
                    ))}
                  </ModernTableBody>
                </ModernTable>
              )}
            </ModernCardContent>
          </ModernCard>
        )}

        <AddHourlyWorkModal
          projectId={project._id}
          isOpen={showAddHours}
          onClose={() => setShowAddHours(false)}
          onSuccess={fetchProjectDetails}
          editLog={editLog}
        />
      </div>
    </ModernMainLayout>
  )
}