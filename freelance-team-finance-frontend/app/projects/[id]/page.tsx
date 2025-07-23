"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import { ArrowLeft, Edit, Plus, DollarSign, Clock } from "lucide-react"
import { PaymentList } from "@/components/payments/payment-list"
import { AddPaymentModal } from "@/components/payments/add-payment-modal"

// Updated interfaces
interface Platform {
  _id: string
  name: string
}
interface Project {
  _id: string
  name: string
  clientName: string
  platform: Platform | string
  currency: string
  status: string
  startDate?: string
  endDate?: string
  priceType: string
  fixedPrice?: number
  hourlyRate?: number
  platformCharge: number
  conversionRate: number
}

interface Payment {
  _id: string
  amount: number
  currency: string
  amountInINR: number
  paymentDate: string
  walletStatus: string
  bankStatus: string
  notes: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayment, setShowAddPayment] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchProjectDetails()
    }
    // eslint-disable-next-line
  }, [params.id])

  const fetchProjectDetails = async () => {
    try {
      // Most APIs return `{project: {...}}` so adjust accordingly
      const [projectDataRaw, paymentsDataRaw] = await Promise.all([
        apiClient.getProject(params.id as string),
        apiClient.request(`/api/project-payments/project/${params.id}`)
      ])
      // If your API returns {project: {...}} wrap accordingly:
      const projectData = projectDataRaw.project ? projectDataRaw.project : projectDataRaw
      setProject(projectData)
      setPayments(Array.isArray(paymentsDataRaw) ? paymentsDataRaw : (paymentsDataRaw.payments || []))
    } catch (error) {
      console.error("Failed to fetch project details:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  // Defensive reduce in case payments is not an array
  const totalEarned = Array.isArray(payments)
    ? payments.reduce((sum, payment) => sum + (payment.amountInINR || 0), 0)
    : 0

  // Platform display helper
  const getPlatformName = () =>
    typeof project.platform === "object" && project.platform !== null
      ? project.platform.name
      : project.platform || "--"

  return (
    <MainLayout>
      <div className="space-y-6">
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
            <CardHeader>
              <CardTitle className="text-lg">Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalEarned.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Count</CardTitle>
            </CardHeader>
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
      </div>
    </MainLayout>
  )
}
