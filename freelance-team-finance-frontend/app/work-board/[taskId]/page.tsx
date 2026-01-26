"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "@/lib/utils"
import { Calendar, User, MessageSquare, ArrowLeft, Users, FileText, Clock, CheckCircle2, XCircle } from "lucide-react"

interface UserItem {
  _id: string
  name: string
  email: string
  role: string
}

interface TaskItem {
  _id: string
  originalTaskId?: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  project?: { _id: string; name: string } | string
  assignedTo?: UserItem | string
  assignedRole?: string
  collaborators?: (UserItem | string)[]
  collaboratorRoles?: string[]
  isGlobal?: boolean
  subtasks?: { title: string; done: boolean; assignedTo?: UserItem | string }[]
  createdBy?: UserItem | string
  createdAt: string
  updatedAt?: string
}

interface CommentItem {
  _id: string
  text: string
  user: UserItem
  createdAt: string
}

interface ActivityItem {
  _id: string
  action: string
  message: string
  user: UserItem
  createdAt: string
}

export default function WorkBoardTaskDetailPage() {
  const params = useParams<{ taskId: string }>()
  const router = useRouter()
  const taskId = params?.taskId as string
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<TaskItem | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])

  useEffect(() => {
    if (!taskId) return
    fetchAll()
    fetchUsers()
  }, [taskId])

  const fetchUsers = async () => {
    try {
      const data = await apiClient.getUsers({ limit: 200 })
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchAll = async () => {
    try {
      let taskData
      let activityTaskId = taskId
      try {
        const data = await apiClient.getTask(taskId)
        taskData = data.task
      } catch {
        const data = await apiClient.getArchivedTask(taskId)
        taskData = data.task
        if (data.task?.originalTaskId) {
          activityTaskId = data.task.originalTaskId
        }
      }
      setTask(taskData)
      const commentsRes = await apiClient.getTaskComments(activityTaskId)
      setComments(Array.isArray(commentsRes.comments) ? commentsRes.comments : [])
      const activityRes = await apiClient.getTaskActivity(activityTaskId)
      setActivity(Array.isArray(activityRes.activity) ? activityRes.activity : [])
    } catch (error) {
      console.error("Failed to load task details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await apiClient.addTaskComment(taskId, commentText.trim())
      setCommentText("")
      await fetchAll()
    } catch (error) {
      console.error("Failed to add comment:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const getProgress = () => {
    const total = task?.subtasks?.length || 0
    const done = task?.subtasks?.filter((s) => s.done).length || 0
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "todo": return "secondary"
      case "in_progress": return "info"
      case "blocked": return "danger"
      case "on_hold": return "warning"
      case "in_review": return "purple"
      case "done": return "success"
      default: return "secondary"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low": return "secondary"
      case "medium": return "info"
      case "high": return "warning"
      case "urgent": return "danger"
      default: return "secondary"
    }
  }

  const getUserName = (user: UserItem | string | undefined) => {
    if (!user) return "Unassigned"
    if (typeof user === "object") return user.name
    const found = users.find((u) => u._id === user)
    return found?.name || "Unknown"
  }

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <LoadingSkeleton width={300} height={40} />
          <LoadingSkeleton variant="card" height={400} />
        </div>
      </ModernMainLayout>
    )
  }

  if (!task) {
    return (
      <ModernMainLayout>
        <div className="text-center py-12 text-gray-500">Task not found</div>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ModernButton variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </ModernButton>
          <h1 className="text-3xl font-bold text-gray-900">Task Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle className="text-2xl">{task.title}</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-6">
                {task.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Status & Priority</h3>
                  <div className="flex flex-wrap gap-2">
                    <ModernBadge variant={getStatusBadge(task.status)}>
                      {task.status.replace("_", " ")}
                    </ModernBadge>
                    <ModernBadge variant={getPriorityBadge(task.priority)}>
                      {task.priority}
                    </ModernBadge>
                    {task.isGlobal && <ModernBadge variant="purple">Visible to everyone</ModernBadge>}
                  </div>
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Subtasks</h3>
                    {getProgress().total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>Progress</span>
                          <span>{getProgress().done}/{getProgress().total} completed</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${getProgress().percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {task.subtasks.map((s, idx) => (
                        <div
                          key={`${s.title}-${idx}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                        >
                          {s.done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className={s.done ? "line-through text-gray-400" : "text-gray-900 font-medium"}>
                              {s.title}
                            </div>
                            {s.assignedTo && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {getUserName(s.assignedTo)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {comments.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-8">No comments yet</div>
                  )}
                  {comments.map((c) => (
                    <div key={c._id} className="p-4 rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {c.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{c.user?.name || "Unknown"}</span>
                            <span className="text-xs text-gray-400">
                              {formatDateTimeDDMMYYYY(c.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">{c.text}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <ModernInput
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                  <ModernButton onClick={handleAddComment} loading={submitting} disabled={submitting || !commentText.trim()}>
                    Post
                  </ModernButton>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>

          <div className="space-y-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle className="text-lg">Details</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Project</div>
                  <div className="text-sm font-medium text-gray-900">
                    {task.project ? (typeof task.project === "object" ? task.project?.name || "—" : "—") : "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Assigned To</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <User className="h-4 w-4" />
                    {typeof task.assignedTo === "object"
                      ? task.assignedTo?.name || "Unassigned"
                      : task.assignedRole || "Unassigned"}
                  </div>
                </div>

                {task.dueDate && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Due Date</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Calendar className="h-4 w-4" />
                      {formatDateDDMMYYYY(task.dueDate)}
                    </div>
                  </div>
                )}

                {(task.collaborators?.length || 0) + (task.collaboratorRoles?.length || 0) > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Collaborators</div>
                    <div className="space-y-2">
                      {task.collaborators?.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="h-4 w-4" />
                          {getUserName(c)}
                        </div>
                      ))}
                      {task.collaboratorRoles?.map((role, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="h-4 w-4" />
                          {roleOptions.find((r) => r.value === role)?.label || role}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500 mb-1">Created By</div>
                  <div className="text-sm text-gray-900">
                    {typeof task.createdBy === "object" ? task.createdBy?.name || "—" : "—"}
                  </div>
                </div>

                {task.createdAt && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Created At</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Clock className="h-4 w-4" />
                      {formatDateTimeDDMMYYYY(task.createdAt)}
                    </div>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Activity Log
                </ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {activity.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-8">No activity yet</div>
                )}
                {activity.map((a) => (
                  <div key={a._id} className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                    <div className="text-sm text-gray-700 mb-1">{a.message}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {a.user?.name || "Unknown"} • {formatDateTimeDDMMYYYY(a.createdAt)}
                    </div>
                  </div>
                ))}
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>
      </div>
    </ModernMainLayout>
  )
}

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "sales", label: "Sales" },
  { value: "developer", label: "Developer" },
]
