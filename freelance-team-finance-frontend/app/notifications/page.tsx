"use client"

import { useEffect, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"
import { 
  Bell, 
  Check, 
  Clock, 
  AlertCircle, 
  Info, 
  DollarSign, 
  Receipt, 
  CheckCheck,
  BellRing
} from "lucide-react"

interface Notification {
  _id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  data?: any
}

export default function ModernNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const data = await apiClient.getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId)
      setNotifications(notifications.map((n) => (n._id === notificationId ? { ...n, read: true } : n)))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true)
      const unreadNotifications = notifications.filter((n) => !n.read)
      await Promise.all(unreadNotifications.map((n) => apiClient.markNotificationAsRead(n._id)))
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "payment": return "success"
      case "expense": return "info"
      case "reminder": return "warning"
      case "alert": return "danger"
      default: return "secondary"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment": return <DollarSign className="h-5 w-5" />
      case "expense": return <Receipt className="h-5 w-5" />
      case "reminder": return <Clock className="h-5 w-5" />
      case "alert": return <AlertCircle className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const todayCount = notifications.filter(n => 
    new Date(n.createdAt).toDateString() === new Date().toDateString()
  ).length

  if (loading) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600 text-lg">
              Stay updated with your team's activities and important alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <ModernButton onClick={markAllAsRead} loading={markingAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark All as Read ({unreadCount})
            </ModernButton>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-white text-lg">Total</ModernCardTitle>
                  <p className="text-white/80 text-sm">All notifications</p>
                </div>
                <Bell className="h-8 w-8 text-white/80" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-3xl font-bold text-white">{notifications.length}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Unread</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Needs attention</p>
                </div>
                <BellRing className="h-8 w-8 text-red-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{unreadCount}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Today</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Recent activity</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">{todayCount}</div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <ModernCardTitle className="text-lg">Payments</ModernCardTitle>
                  <p className="text-gray-600 text-sm">Payment alerts</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                {notifications.filter((n) => n.type === "payment").length}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Notifications List */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="text-xl">All Notifications</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</h3>
                <p className="text-gray-500">You'll see important updates and alerts here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`group relative rounded-xl border p-6 transition-all duration-200 ${
                      !notification.read 
                        ? "bg-blue-50 border-blue-200 shadow-sm" 
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                        !notification.read ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <ModernBadge variant={getTypeColor(notification.type)} className="capitalize">
                            {notification.type}
                          </ModernBadge>
                          {!notification.read && (
                            <ModernBadge variant="info" size="sm">
                              New
                            </ModernBadge>
                          )}
                        </div>
                        
                        <p className="text-gray-900 font-medium mb-2 leading-relaxed">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatDateTimeDDMMYYYY(notification.createdAt)}</span>
                        </div>
                      </div>

                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification._id)}
                          >
                            <Check className="h-4 w-4" />
                            Mark Read
                          </ModernButton>
                        </div>
                      )}
                    </div>

                    {!notification.read && (
                      <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>
    </ModernMainLayout>
  )
}