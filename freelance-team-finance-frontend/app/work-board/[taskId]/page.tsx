"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { formatDateDDMMYYYY } from "@/lib/utils"
import { Calendar, User, MessageSquare } from "lucide-react"

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
  subtasks?: { title: string; done: boolean }[]
  createdBy?: UserItem | string
  createdAt: string
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
  const taskId = params?.taskId as string
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<TaskItem | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!taskId) return
    fetchAll()
  }, [taskId])

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
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="text-2xl">{task.title}</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent className="space-y-4">
            {task.description && <p className="text-gray-700">{task.description}</p>}
            <div className="flex flex-wrap gap-2">
              <ModernBadge variant="info">{task.status.replace("_", " ")}</ModernBadge>
              <ModernBadge variant="warning">{task.priority}</ModernBadge>
              {task.project && (
                <ModernBadge variant="secondary">
                  Project: {typeof task.project === "object" ? task.project?.name || "Project" : "Project"}
                </ModernBadge>
              )}
              {task.isGlobal && <ModernBadge variant="purple">Visible to everyone</ModernBadge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {typeof task.assignedTo === "object"
                  ? task.assignedTo?.name || "Unassigned"
                  : task.assignedRole || "Unassigned"}
              </div>
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateDDMMYYYY(task.dueDate)}
                </div>
              )}
            </div>
            {getProgress().total > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {getProgress().done}/{getProgress().total} subtasks completed
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${getProgress().percent}%` }} />
                </div>
              </div>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Subtasks</div>
                {task.subtasks.map((s, idx) => (
                  <div key={`${s.title}-${idx}`} className="text-sm text-gray-600">
                    {s.done ? "✅" : "⬜"} {s.title}
                  </div>
                ))}
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent className="space-y-4">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {comments.length === 0 && <div className="text-sm text-gray-400">No comments yet</div>}
                {comments.map((c) => (
                  <div key={c._id} className="p-3 rounded-xl border border-gray-200 bg-white">
                    <div className="text-sm text-gray-700">{c.text}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {c.user?.name || "Unknown"} • {formatDateDDMMYYYY(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <ModernInput
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                />
                <ModernButton onClick={handleAddComment} loading={submitting} disabled={submitting}>
                  Post
                </ModernButton>
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="text-lg">Activity</ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {activity.length === 0 && <div className="text-sm text-gray-400">No activity yet</div>}
              {activity.map((a) => (
                <div key={a._id} className="p-3 rounded-xl border border-gray-200 bg-white">
                  <div className="text-sm text-gray-700">{a.message}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {a.user?.name || "Unknown"} • {formatDateDDMMYYYY(a.createdAt)}
                  </div>
                </div>
              ))}
            </ModernCardContent>
          </ModernCard>
        </div>
      </div>
    </ModernMainLayout>
  )
}
