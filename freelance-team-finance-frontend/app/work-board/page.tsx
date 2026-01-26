"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { apiClient } from "@/lib/api"
import { cn, formatDateDDMMYYYY } from "@/lib/utils"
import {
  Plus,
  Search,
  Calendar,
  Users,
  User,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  LayoutGrid,
  List,
  Eye,
  Archive
} from "lucide-react"

interface UserItem {
  _id: string
  name: string
  email: string
  role: string
}

interface ProjectItem {
  _id: string
  name: string
  status?: string
}

interface TaskItem {
  _id: string
  title: string
  description?: string
  status: "todo" | "in_progress" | "blocked" | "on_hold" | "in_review" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string
  project?: ProjectItem | string
  assignedTo?: UserItem | string
  assignedRole?: string
  collaborators?: (UserItem | string)[]
  collaboratorRoles?: string[]
  isGlobal?: boolean
  subtasks?: { title: string; done: boolean; assignedTo?: UserItem | string }[]
  createdBy?: UserItem | string
  createdAt: string
  order?: number
}

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "on_hold", label: "On Hold" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "sales", label: "Sales" },
  { value: "developer", label: "Developer" },
]

export default function WorkBoardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [archivedTasks, setArchivedTasks] = useState<TaskItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  const [activeScope, setActiveScope] = useState<"active" | "archived">("active")
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [projectStatusFilter, setProjectStatusFilter] = useState("")

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [assignedToFilter, setAssignedToFilter] = useState("")
  const [assignedRoleFilter, setAssignedRoleFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [dueFrom, setDueFrom] = useState("")
  const [dueTo, setDueTo] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    project: "",
    assignedTo: "",
    assignedRole: "",
    collaborators: [] as string[],
    collaboratorRoles: [] as string[],
    isGlobal: false,
    subtasks: [] as { title: string; done: boolean; assignedTo?: string }[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTasks()
    fetchArchivedTasks()
    fetchUsers()
    fetchProjects()
    initializeTaskNotifications()
  }, [])

  useEffect(() => {
    if (activeScope === "archived") {
      setViewMode("list")
    }
  }, [activeScope])

  const fetchUsers = async () => {
    try {
      const data = await apiClient.getUsers({ limit: 200 })
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchProjects = async () => {
    try {
      const data = await apiClient.getProjects()
      setProjects(Array.isArray(data.projects) ? data.projects : [])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }

  const filteredProjects = useMemo(() => {
    if (!projectStatusFilter) return projects
    return projects.filter((p) => p.status === projectStatusFilter)
  }, [projects, projectStatusFilter])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => u.role !== "admin")
  }, [users])

  const fetchTasks = async () => {
    try {
      const data = await apiClient.getTasks()
      const list = Array.isArray(data.tasks) ? data.tasks : []
      setTasks(list)
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchArchivedTasks = async () => {
    try {
      const data = await apiClient.getArchivedTasks()
      const list = Array.isArray(data.tasks) ? data.tasks : []
      setArchivedTasks(list)
    } catch (error) {
      console.error("Failed to fetch archived tasks:", error)
    }
  }

  const initializeTaskNotifications = async () => {
    if (!("Notification" in window)) return
    if (Notification.permission !== "granted") {
      await Notification.requestPermission()
    }
    const checkNotifications = async () => {
      try {
        const data = await apiClient.getNotifications()
        const notifications = Array.isArray(data.notifications) ? data.notifications : []
        const seen = new Set<string>(JSON.parse(localStorage.getItem("seenTaskNotifications") || "[]"))
        for (const n of notifications) {
          if (n.type?.startsWith("task_") && !seen.has(n._id)) {
            if (Notification.permission === "granted") {
              new Notification("Task Update", { body: n.message, tag: n._id })
            }
            seen.add(n._id)
            await apiClient.markNotificationAsRead(n._id)
          }
        }
        localStorage.setItem("seenTaskNotifications", JSON.stringify(Array.from(seen)))
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }
    checkNotifications()
    setInterval(checkNotifications, 60 * 1000)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      project: "",
      assignedTo: "",
      assignedRole: "",
      collaborators: [],
      collaboratorRoles: [],
      isGlobal: false,
      subtasks: [],
    })
    setErrors({})
    setNewSubtaskTitle("")
    setProjectStatusFilter("")
  }

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task)
    setNewSubtaskTitle("")
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      project: typeof task.project === "object" ? task.project?._id || "" : (task.project || ""),
      assignedTo: typeof task.assignedTo === "object" ? task.assignedTo?._id || "" : (task.assignedTo || ""),
      assignedRole: task.assignedRole || "",
      collaborators: (task.collaborators || [])
        .map((c) => (typeof c === "object" ? c?._id : c))
        .filter((id): id is string => Boolean(id)),
      collaboratorRoles: task.collaboratorRoles || [],
      isGlobal: !!task.isGlobal,
      subtasks: (task.subtasks || []).map((s) => ({
        title: s.title,
        done: s.done || false,
        assignedTo: typeof s.assignedTo === "object" ? s.assignedTo?._id : (s.assignedTo || undefined),
      })),
    })
    setShowForm(true)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description || "",
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        project: formData.project || null,
        assignedTo: formData.assignedTo || null,
        assignedRole: formData.assignedRole || null,
        collaborators: formData.collaborators,
        collaboratorRoles: formData.collaboratorRoles,
        isGlobal: formData.isGlobal,
        subtasks: formData.subtasks,
      }

      if (editingTask) {
        await apiClient.updateTask(editingTask._id, payload)
      } else {
        await apiClient.createTask(payload)
      }

      setShowForm(false)
      setEditingTask(null)
      resetForm()
      await fetchTasks()
      await fetchArchivedTasks()
    } catch (error) {
      console.error("Failed to save task:", error)
      setErrors({ submit: "Failed to save task. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (task: TaskItem) => {
    if (!window.confirm(`Delete "${task.title}"? This action cannot be undone.`)) return
    try {
      await apiClient.deleteTask(task._id)
      setTasks(tasks.filter((t) => t._id !== task._id))
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleArchive = async (task: TaskItem) => {
    if (!window.confirm(`Archive "${task.title}"?`)) return
    try {
      await apiClient.archiveTask(task._id)
      await fetchTasks()
      await fetchArchivedTasks()
    } catch (error) {
      console.error("Failed to archive task:", error)
    }
  }

  const activeTasks = activeScope === "archived" ? archivedTasks : tasks

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !statusFilter || task.status === statusFilter
      const matchesPriority = !priorityFilter || task.priority === priorityFilter
      const assignedToId = typeof task.assignedTo === "object" ? task.assignedTo?._id : task.assignedTo
      const matchesAssignedTo = !assignedToFilter || assignedToId === assignedToFilter
      const matchesAssignedRole = !assignedRoleFilter || task.assignedRole === assignedRoleFilter
      const projectId = typeof task.project === "object" ? task.project?._id : task.project
      const matchesProject = !projectFilter || projectId === projectFilter
      const dueValue = task.dueDate ? new Date(task.dueDate).getTime() : null
      const matchesFrom = !dueFrom || (dueValue !== null && dueValue >= new Date(dueFrom).getTime())
      const matchesTo = !dueTo || (dueValue !== null && dueValue <= new Date(dueTo).getTime())
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo && matchesAssignedRole && matchesProject && matchesFrom && matchesTo
    })
  }, [activeTasks, searchTerm, statusFilter, priorityFilter, assignedToFilter, assignedRoleFilter, projectFilter, dueFrom, dueTo])

  const tasksByStatus = useMemo(() => {
    return statusOptions.reduce<Record<string, TaskItem[]>>((acc, s) => {
      const tasks = filteredTasks.filter((t) => t.status === s.value)
      acc[s.value] = tasks.sort((a, b) => (a.order || 0) - (b.order || 0))
      return acc
    }, {})
  }, [filteredTasks])

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

  const getAssigneeLabel = (task: TaskItem) => {
    if (task.assignedRole) {
      const role = roleOptions.find((r) => r.value === task.assignedRole)
      return role?.label || task.assignedRole
    }
    if (task.assignedTo) {
      return typeof task.assignedTo === "object" ? task.assignedTo.name : "Assigned User"
    }
    return "Unassigned"
  }

  const getProjectName = (project: TaskItem["project"]) => {
    if (!project) return "—"
    if (typeof project === "object") return project.name
    const found = projects.find((p) => p._id === project)
    return found?.name || "—"
  }

  const getPriorityCardClass = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-50 border-red-200"
      case "high": return "bg-amber-50 border-amber-200"
      case "medium": return "bg-blue-50 border-blue-200"
      case "low": return "bg-gray-50 border-gray-200"
      default: return "bg-white border-gray-200"
    }
  }

  const getProgress = (task: TaskItem) => {
    const total = task.subtasks?.length || 0
    const done = task.subtasks?.filter((s) => s.done).length || 0
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }

  const handleDropStatus = async (status: TaskItem["status"], targetIndex?: number) => {
    if (!draggingTaskId) return
    setMovingTaskId(draggingTaskId)
    try {
      const currentTask = tasks.find((t) => t._id === draggingTaskId)
      if (!currentTask) return

      const payload: any = { status }
      
      if (targetIndex !== undefined && currentTask.status === status) {
        const sameStatusTasks = [...(tasksByStatus[status] || [])]
        const currentIndex = sameStatusTasks.findIndex((t) => t._id === draggingTaskId)
        
        if (currentIndex !== -1 && currentIndex !== targetIndex) {
          const [movedTask] = sameStatusTasks.splice(currentIndex, 1)
          sameStatusTasks.splice(targetIndex, 0, movedTask)
          
          const updatePromises = sameStatusTasks.map((task, idx) => {
            return apiClient.updateTask(task._id, { order: idx, status })
          })
          await Promise.all(updatePromises)
        }
      } else {
        if (currentTask.status !== status) {
          payload.order = 0
        }
        await apiClient.updateTask(draggingTaskId, payload)
      }
      
      await fetchTasks()
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setTimeout(() => {
        setDraggingTaskId(null)
        setMovingTaskId(null)
      }, 300)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (!draggingTaskId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const mouseY = e.clientY
    if (mouseY < midpoint) {
      e.currentTarget.style.borderTop = "2px solid #3b82f6"
      e.currentTarget.style.borderBottom = "none"
    } else {
      e.currentTarget.style.borderTop = "none"
      e.currentTarget.style.borderBottom = "2px solid #3b82f6"
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.style.borderTop = "none"
    e.currentTarget.style.borderBottom = "none"
  }

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={120} height={40} />
          </div>
          <LoadingSkeleton variant="card" height={400} />
        </div>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Work Board</h1>
            <p className="text-gray-600 text-lg">
              Create, assign, and collaborate on tasks with list and board views
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ModernButton
              variant={activeScope === "active" ? "default" : "outline"}
              onClick={() => setActiveScope("active")}
            >
              Active
            </ModernButton>
            <ModernButton
              variant={activeScope === "archived" ? "default" : "outline"}
              onClick={() => setActiveScope("archived")}
            >
              Archived
            </ModernButton>
            <ModernButton
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List View
            </ModernButton>
            <ModernButton
              variant={viewMode === "board" ? "default" : "outline"}
              onClick={() => setViewMode("board")}
              disabled={activeScope === "archived"}
            >
              <LayoutGrid className="h-4 w-4" />
              Board View
            </ModernButton>
            <ModernButton
              onClick={() => {
                setEditingTask(null)
                resetForm()
                setShowForm(true)
              }}
              disabled={activeScope === "archived"}
            >
              <Plus className="h-4 w-4" />
              Add Task
            </ModernButton>
          </div>
        </div>

        <ModernCard>
          <ModernCardContent className="p-6 space-y-4">
            <ModernInput
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
              <ModernSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: "", label: "All Status" }, ...statusOptions]}
              />
              <ModernSelect
                label="Priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[{ value: "", label: "All Priority" }, ...priorityOptions]}
              />
              <ModernSelect
                label="Assigned User"
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                options={[
                  { value: "", label: "All Users" },
                  ...filteredUsers.map((u) => ({ value: u._id, label: u.name })),
                ]}
              />
              <ModernSelect
                label="Assigned Role"
                value={assignedRoleFilter}
                onChange={(e) => setAssignedRoleFilter(e.target.value)}
                options={[{ value: "", label: "All Roles" }, ...roleOptions]}
              />
              <ModernSelect
                label="Project Status"
                value={projectStatusFilter}
                onChange={(e) => {
                  setProjectStatusFilter(e.target.value)
                  setProjectFilter("")
                }}
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending" },
                  { value: "working", label: "Working" },
                  { value: "completed", label: "Completed" },
                  { value: "extended", label: "Extended" },
                  { value: "paused", label: "Paused" },
                ]}
              />
              <ModernSelect
                label="Project"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                options={[
                  { value: "", label: "All Projects" },
                  ...filteredProjects.map((p) => ({ value: p._id, label: p.name })),
                ]}
              />
              <ModernInput
                label="Due From"
                type="date"
                value={dueFrom}
                onChange={(e) => setDueFrom(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
              <ModernInput
                label="Due To"
                type="date"
                value={dueTo}
                onChange={(e) => setDueTo(e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </ModernCardContent>
        </ModernCard>

        {viewMode === "list" || activeScope === "archived" ? (
          <ModernCard>
            <ModernCardHeader>
              <div className="flex items-center justify-between">
                <ModernCardTitle className="text-xl">Tasks</ModernCardTitle>
                <ModernBadge variant="secondary">
                  {filteredTasks.length} of {activeTasks.length}
                </ModernBadge>
              </div>
            </ModernCardHeader>
            <ModernCardContent className="p-0">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No tasks found</p>
                  <p className="text-gray-400">Try adjusting your filters or add a new task</p>
                </div>
              ) : (
                <ModernTable>
                  <ModernTableHeader>
                    <ModernTableRow>
                      <ModernTableHead>Task</ModernTableHead>
                    <ModernTableHead>Status</ModernTableHead>
                    <ModernTableHead>Priority</ModernTableHead>
                    <ModernTableHead>Project</ModernTableHead>
                    <ModernTableHead>Assigned</ModernTableHead>
                    <ModernTableHead>Due Date</ModernTableHead>
                    <ModernTableHead>Progress</ModernTableHead>
                    <ModernTableHead>Collaborators</ModernTableHead>
                      <ModernTableHead className="text-right">Actions</ModernTableHead>
                    </ModernTableRow>
                  </ModernTableHeader>
                  <ModernTableBody>
                    {filteredTasks.map((task) => (
                      <ModernTableRow key={task._id}>
                        <ModernTableCell>
                          <div>
                            <div className="font-semibold text-gray-900">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                            )}
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <ModernBadge variant={getStatusBadge(task.status)}>{task.status.replace("_", " ")}</ModernBadge>
                        </ModernTableCell>
                        <ModernTableCell>
                          <ModernBadge variant={getPriorityBadge(task.priority)}>{task.priority}</ModernBadge>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="text-sm text-gray-600">
                            {getProjectName(task.project)}
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            {getAssigneeLabel(task)}
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="text-sm text-gray-600">
                            {task.dueDate ? formatDateDDMMYYYY(task.dueDate) : "—"}
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          {getProgress(task).total > 0 ? (
                            <div className="w-full">
                              <div className="text-xs text-gray-500 mb-1">
                                {getProgress(task).done}/{getProgress(task).total} done
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${getProgress(task).percent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            {(task.collaborators?.length || 0) + (task.collaboratorRoles?.length || 0)}
                          </div>
                        </ModernTableCell>
                        <ModernTableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/work-board/${task._id}`} className="inline-flex">
                              <ModernButton variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </ModernButton>
                            </Link>
                            {activeScope === "active" && (
                              <ModernButton variant="outline" size="sm" onClick={() => handleEdit(task)}>
                                Edit
                              </ModernButton>
                            )}
                            {activeScope === "active" && task.status === "done" && (
                              <ModernButton variant="outline" size="sm" onClick={() => handleArchive(task)}>
                                <Archive className="h-4 w-4" />
                              </ModernButton>
                            )}
                            {activeScope === "active" && (
                              <ModernButton variant="outline" size="sm" onClick={() => handleDelete(task)} className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                                Delete
                              </ModernButton>
                            )}
                          </div>
                        </ModernTableCell>
                      </ModernTableRow>
                    ))}
                  </ModernTableBody>
                </ModernTable>
              )}
            </ModernCardContent>
          </ModernCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6 h-[calc(100vh-280px)]">
            {statusOptions.map((status) => (
              <ModernCard key={status.value} className="h-full flex flex-col">
                <ModernCardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <ModernCardTitle className="text-lg">{status.label}</ModernCardTitle>
                    <ModernBadge variant="secondary">{tasksByStatus[status.value]?.length || 0}</ModernBadge>
                  </div>
                </ModernCardHeader>
                <ModernCardContent
                  className="space-y-4 flex-1 overflow-y-auto px-2 thin-scrollbar"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggingTaskId) {
                      const tasks = tasksByStatus[status.value] || []
                      const containerRect = e.currentTarget.getBoundingClientRect()
                      const mouseY = e.clientY - containerRect.top
                      let targetIndex = tasks.length
                      
                      for (let i = 0; i < tasks.length; i++) {
                        const taskEl = document.querySelector(`[data-task-id="${tasks[i]._id}"]`)
                        if (taskEl) {
                          const taskRect = taskEl.getBoundingClientRect()
                          const relativeTop = taskRect.top - containerRect.top
                          if (mouseY < relativeTop + taskRect.height / 2) {
                            targetIndex = i
                            break
                          }
                        }
                      }
                      handleDropStatus(status.value as TaskItem["status"], targetIndex)
                    }
                  }}
                >
                  {(tasksByStatus[status.value] || []).map((task, index) => (
                    <div
                      key={task._id}
                      data-task-id={task._id}
                      className={cn(
                        "relative p-4 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-opacity",
                        getPriorityCardClass(task.priority),
                        movingTaskId === task._id && "opacity-50"
                      )}
                      draggable={!movingTaskId}
                      onDragStart={() => {
                        if (!movingTaskId) setDraggingTaskId(task._id)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (task.status === status.value && draggingTaskId && draggingTaskId !== task._id) {
                          handleDragOver(e, index)
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderTop = "none"
                        e.currentTarget.style.borderBottom = "none"
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.currentTarget.style.borderTop = "none"
                        e.currentTarget.style.borderBottom = "none"
                        if (draggingTaskId && draggingTaskId !== task._id && task.status === status.value) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const mouseY = e.clientY
                          const midpoint = rect.top + rect.height / 2
                          const targetIndex = mouseY < midpoint ? index : index + 1
                          handleDropStatus(status.value as TaskItem["status"], targetIndex)
                        }
                      }}
                    >
                      {movingTaskId === task._id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-xl z-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        {task.priority === "urgent" ? (
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                        ) : task.priority === "high" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <ModernBadge variant={getPriorityBadge(task.priority)} size="sm">
                          {task.priority}
                        </ModernBadge>
                        <ModernBadge variant={getStatusBadge(task.status)} size="sm">
                          {task.status.replace("_", " ")}
                        </ModernBadge>
                      </div>
                      {getProgress(task).total > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            {getProgress(task).done}/{getProgress(task).total} done
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${getProgress(task).percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 flex items-center gap-2 mb-3">
                        <User className="h-4 w-4" />
                        {getAssigneeLabel(task)}
                      </div>
                      {task.dueDate && (
                        <div className="text-xs text-gray-500 flex items-center gap-2 mb-3">
                          <Calendar className="h-3 w-3" />
                          {formatDateDDMMYYYY(task.dueDate)}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Link href={`/work-board/${task._id}`} className="inline-flex">
                          <ModernButton variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </ModernButton>
                        </Link>
                        <ModernButton variant="outline" size="sm" onClick={() => handleEdit(task)}>
                          Edit
                        </ModernButton>
                        {task.status === "done" && (
                          <ModernButton variant="outline" size="sm" onClick={() => handleArchive(task)}>
                            <Archive className="h-4 w-4" />
                          </ModernButton>
                        )}
                      </div>
                    </div>
                  ))}
                  {(tasksByStatus[status.value] || []).length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-6">No tasks</div>
                  )}
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false)
          setEditingTask(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingTask ? "Edit Task" : "Add New Task"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {errors.submit}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernInput
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Task title"
                error={errors.title}
              />
              <ModernSelect
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                options={statusOptions}
              />
              <ModernSelect
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                options={priorityOptions}
              />
              <ModernInput
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                icon={<Calendar className="h-4 w-4" />}
              />
              <ModernSelect
                label="Project Status"
                value={projectStatusFilter}
                onChange={(e) => {
                  setProjectStatusFilter(e.target.value)
                  setFormData({ ...formData, project: "" })
                }}
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending" },
                  { value: "working", label: "Working" },
                  { value: "completed", label: "Completed" },
                  { value: "extended", label: "Extended" },
                  { value: "paused", label: "Paused" },
                ]}
              />
              <ModernSelect
                label="Project"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                options={[
                  { value: "", label: "No project" },
                  ...filteredProjects.map((p) => ({ value: p._id, label: p.name })),
                ]}
              />
              <ModernSelect
                label="Assign to User"
                value={formData.assignedTo}
                onChange={(e) => {
                  setFormData({ ...formData, assignedTo: e.target.value, assignedRole: "" })
                }}
                options={[
                  { value: "", label: "Unassigned" },
                  ...filteredUsers.map((u) => ({ value: u._id, label: u.name })),
                ]}
              />
              <ModernSelect
                label="Assign to Role"
                value={formData.assignedRole}
                onChange={(e) => {
                  setFormData({ ...formData, assignedRole: e.target.value, assignedTo: "" })
                }}
                options={[
                  { value: "", label: "No role" },
                  ...roleOptions,
                ]}
              />
            </div>

            <ModernInput
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details or notes"
            />

            <div className="flex items-center gap-3">
              <input
                id="isGlobalTask"
                type="checkbox"
                checked={formData.isGlobal}
                onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isGlobalTask" className="text-sm font-medium text-gray-700">
                Show this task to everyone
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subtasks</label>
              <div className="space-y-2">
                {formData.subtasks.length === 0 && (
                  <div className="text-sm text-gray-400">No subtasks yet</div>
                )}
                {formData.subtasks.map((subtask, index) => (
                  <div key={`${subtask.title}-${index}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      onChange={(e) => {
                        const next = [...formData.subtasks]
                        next[index] = { ...next[index], done: e.target.checked }
                        setFormData({ ...formData, subtasks: next })
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={cn("text-sm flex-1", subtask.done ? "line-through text-gray-400" : "text-gray-700")}>
                      {subtask.title}
                    </span>
                    <select
                      value={subtask.assignedTo || ""}
                      onChange={(e) => {
                        const next = [...formData.subtasks]
                        next[index] = { ...next[index], assignedTo: e.target.value || undefined }
                        setFormData({ ...formData, subtasks: next })
                      }}
                      className="text-xs px-2 py-1 rounded border border-gray-300"
                    >
                      <option value="">Unassigned</option>
                      {filteredUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <ModernButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = formData.subtasks.filter((_, i) => i !== index)
                        setFormData({ ...formData, subtasks: next })
                      }}
                    >
                      Remove
                    </ModernButton>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <ModernInput
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask"
                />
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!newSubtaskTitle.trim()) return
                    setFormData({
                      ...formData,
                      subtasks: [...formData.subtasks, { title: newSubtaskTitle.trim(), done: false, assignedTo: undefined }],
                    })
                    setNewSubtaskTitle("")
                  }}
                >
                  Add
                </ModernButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Collaborate Users</label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-3 space-y-2">
                  {filteredUsers.length === 0 && <div className="text-sm text-gray-400">No users</div>}
                  {filteredUsers.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.collaborators.includes(u._id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.collaborators, u._id]
                            : formData.collaborators.filter((id) => id !== u._id)
                          setFormData({ ...formData, collaborators: next })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {u.name} <span className="text-xs text-gray-400">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Collaborate Roles</label>
                <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                  {roleOptions.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.collaboratorRoles.includes(r.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.collaboratorRoles, r.value]
                            : formData.collaboratorRoles.filter((role) => role !== r.value)
                          setFormData({ ...formData, collaboratorRoles: next })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <ModernButton type="submit" className="flex-1" loading={submitting} disabled={submitting}>
                {editingTask ? "Update Task" : "Create Task"}
              </ModernButton>
              <ModernButton
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setEditingTask(null)
                  resetForm()
                }}
                className="flex-1"
              >
                Cancel
              </ModernButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModernMainLayout>
  )
}
