"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import { ArrowLeft, Edit, Plus } from "lucide-react"
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

export default function ProjectDetailPage() {
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
    // eslint-disable-next-line
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
      // Only fetch hourly work for hourly projects
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
    if (!window.confirm("Delete this week log?")) return
    try {
      await apiClient.deleteHourlyWork(logId)
      fetchProjectDetails()
    } catch (e) {
      alert("Delete failed!")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "completed": return "bg-blue-100 text-blue-800"
      case "paused": return "bg-yellow-100 text-yellow-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
        </div>
      </MainLayout>
    )
  }

  const totalEarned = Array.isArray(payments)
    ? payments.reduce((sum, payment) => sum + (payment.amountInINR || 0), 0)
    : 0

  const getPlatformName = () =>
    typeof project.platform === "object" && project.platform !== null
      ? project.platform.name
      : project.platform || "--"

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">{project.clientName}</p>
          </div>
          <Link href={`/projects/${project._id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </Link>
        </div>

        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Project Status</CardTitle></CardHeader>
            <CardContent>
              <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Total Earned</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalEarned.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Payment Count</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Platform:</span>
                  <p className="text-sm">{getPlatformName()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Currency:</span>
                  <p className="text-sm">{project.currency || "--"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Price Type:</span>
                  <p className="text-sm capitalize">{project.priceType || "--"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Rate:</span>
                  <p className="text-sm">
                    {project.priceType === "fixed" && project.fixedPrice !== undefined
                      ? `${project.currency} ${project.fixedPrice}`
                      : project.priceType === "hourly" && project.hourlyRate !== undefined
                        ? `${project.currency} ${project.hourlyRate}/hr`
                        : "--"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Start Date:</span>
                  <p className="text-sm">
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "--"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">End Date:</span>
                  <p className="text-sm">
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString()
                      : "--"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Platform Charge:</span>
                  <p className="text-sm">
                    {project.platformCharge !== undefined ? `${project.platformCharge}%` : "--"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Conversion Rate:</span>
                  <p className="text-sm">
                    {project.conversionRate !== undefined ? project.conversionRate : "--"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Payments</CardTitle>
              <Button size="sm" onClick={() => setShowAddPayment(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PaymentList payments={payments} onPaymentUpdate={fetchProjectDetails} />
          </CardContent>
        </Card>
        <AddPaymentModal
          projectId={params.id as string}
          isOpen={showAddPayment}
          onClose={() => setShowAddPayment(false)}
          onSuccess={fetchProjectDetails}
        />

        {/* Hourly Work Section */}
        {project.priceType === "hourly" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Weekly Hour Logs</CardTitle>
                <Button size="sm" onClick={() => { setEditLog(null); setShowAddHours(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Week
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hourlyWork.length === 0 ? (
                <div className="text-gray-500 text-center">No week logs yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border">Week Start</th>
                        <th className="p-2 border">Hours</th>
                        <th className="p-2 border">User</th>
                        <th className="p-2 border">Billed</th>
                        <th className="p-2 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlyWork.map(log => (
                        <tr key={log._id} className="border-b">
                          <td className="p-2 border">{log.weekStart ? new Date(log.weekStart).toLocaleDateString() : ""}</td>
                          <td className="p-2 border">{log.hours}</td>
                          <td className="p-2 border">{log.user?.name || "--"}</td>
                          <td className="p-2 border">{log.billed ? "Yes" : "No"}</td>
                          <td className="p-2 border space-x-2">
                            <Button size="xs" variant="outline"
                              onClick={() => { setEditLog(log); setShowAddHours(true) }}>Edit</Button>
                            <Button size="xs" variant="destructive"
                              onClick={() => handleDeleteLog(log._id)}>Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <AddHourlyWorkModal
                projectId={project._id}
                isOpen={showAddHours}
                onClose={() => setShowAddHours(false)}
                onSuccess={fetchProjectDetails}
                editLog={editLog}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
