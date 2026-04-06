"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernInput } from "@/components/ui/modern-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Bold, Check, ClipboardList, Italic, List, Pin, Plus, StickyNote, Strikethrough, Trash2, Underline } from "lucide-react"

type Todo = {
  _id: string
  text: string
  done: boolean
  order?: number
  createdAt: string
  updatedAt: string
}

type Note = {
  _id: string
  title?: string
  content: string
  color?: string
  pinned?: boolean
  order?: number
  createdAt: string
  updatedAt: string
}

const noteColors = [
  { id: "yellow", label: "Sunny", bg: "bg-yellow-100", border: "border-yellow-200" },
  { id: "pink", label: "Pink", bg: "bg-pink-100", border: "border-pink-200" },
  { id: "purple", label: "Purple", bg: "bg-purple-100", border: "border-purple-200" },
  { id: "blue", label: "Blue", bg: "bg-blue-100", border: "border-blue-200" },
  { id: "green", label: "Mint", bg: "bg-green-100", border: "border-green-200" },
  { id: "orange", label: "Orange", bg: "bg-orange-100", border: "border-orange-200" },
] as const

function colorClasses(color?: string) {
  const match = noteColors.find((c) => c.id === color)
  return match ? `${match.bg} ${match.border}` : "bg-yellow-100 border-yellow-200"
}

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; error?: unknown }
    const msg = typeof e.message === "string" ? e.message : ""
    const alt = typeof e.error === "string" ? e.error : ""
    return msg || alt || "Something went wrong."
  }
  return "Something went wrong."
}

export default function TodoStickyPage() {
  const [tab, setTab] = useState<"todo" | "sticky">("todo")

  const [todos, setTodos] = useState<Todo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // Todo form
  const [newTodoText, setNewTodoText] = useState("")
  const [todoBusyId, setTodoBusyId] = useState<string | null>(null)
  const [todoError, setTodoError] = useState<string>("")

  // Note create/edit
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteForm, setNoteForm] = useState({ title: "", content: "", color: "yellow", pinned: false })
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<string>("")

  // Drag & drop
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null)
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null)

  // Inline note edit
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, { title: string; content: string; color: string; pinned: boolean }>>({})
  const noteSaveTimers = useRef<Record<string, number>>({})
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const stats = useMemo(() => {
    const done = todos.filter((t) => t.done).length
    const open = todos.length - done
    const pinned = notes.filter((n) => n.pinned).length
    return { done, open, total: todos.length, pinned, notes: notes.length }
  }, [todos, notes])

  const flushNoteSave = async (noteId: string) => {
    const draft = noteDrafts[noteId]
    if (!draft) return
    setNoteBusyId(noteId)
    try {
      const res = await apiClient.updateStickyNote(noteId, {
        title: draft.title,
        content: draft.content,
        color: draft.color,
        pinned: draft.pinned,
      })
      const updated = res?.note
      if (updated?._id) {
        setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)))
      }
    } catch (e: unknown) {
      setNoteError(getErrorMessage(e) || "Failed to save note.")
    } finally {
      setNoteBusyId(null)
    }
  }

  const queueNoteSave = (noteId: string) => {
    const existing = noteSaveTimers.current[noteId]
    if (existing) window.clearTimeout(existing)
    noteSaveTimers.current[noteId] = window.setTimeout(() => {
      void flushNoteSave(noteId)
    }, 700)
  }

  const ensureDraft = (note: Note) => {
    setNoteDrafts((prev) => {
      if (prev[note._id]) return prev
      return {
        ...prev,
        [note._id]: {
          title: note.title || "",
          content: note.content || "",
          color: note.color || "yellow",
          pinned: Boolean(note.pinned),
        },
      }
    })
  }

  // Avoid cursor jump: only set innerHTML once when entering edit mode.
  useEffect(() => {
    if (!editingNoteId) return
    const note = notes.find((n) => n._id === editingNoteId)
    if (!note) return

    ensureDraft(note)

    const el = contentRefs.current[editingNoteId]
    if (!el) return

    const draftHtml = noteDrafts[editingNoteId]?.content
    const desired = typeof draftHtml === "string" ? draftHtml : note.content || ""
    if (el.innerHTML !== desired) {
      el.innerHTML = desired
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNoteId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [todoRes, noteRes] = await Promise.all([apiClient.getTodos(), apiClient.getStickyNotes()])
      const todoList = Array.isArray(todoRes?.todos) ? todoRes.todos : Array.isArray(todoRes) ? todoRes : []
      const noteList = Array.isArray(noteRes?.notes) ? noteRes.notes : Array.isArray(noteRes) ? noteRes : []
      setTodos(todoList)
      setNotes(noteList)
    } catch (e: unknown) {
      setTodoError(getErrorMessage(e) || "Failed to load your to-dos/notes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const addTodo = async () => {
    const text = newTodoText.trim()
    if (!text) return
    setTodoError("")
    setTodoBusyId("new")
    try {
      const res = await apiClient.createTodo({ text })
      const created = res?.todo
      if (created?._id) {
        setTodos((prev) => [created, ...prev])
        setNewTodoText("")
      } else {
        await fetchAll()
        setNewTodoText("")
      }
    } catch (e: unknown) {
      setTodoError(getErrorMessage(e) || "Failed to add todo.")
    } finally {
      setTodoBusyId(null)
    }
  }

  const toggleTodo = async (todo: Todo) => {
    setTodoError("")
    setTodoBusyId(todo._id)
    const nextDone = !todo.done
    setTodos((prev) => prev.map((t) => (t._id === todo._id ? { ...t, done: nextDone } : t)))
    try {
      const res = await apiClient.updateTodo(todo._id, { done: nextDone })
      const updated = res?.todo
      if (updated?._id) setTodos((prev) => prev.map((t) => (t._id === todo._id ? updated : t)))
    } catch (e: unknown) {
      setTodos((prev) => prev.map((t) => (t._id === todo._id ? todo : t)))
      setTodoError(getErrorMessage(e) || "Failed to update todo.")
    } finally {
      setTodoBusyId(null)
    }
  }

  const deleteTodo = async (todo: Todo) => {
    setTodoError("")
    setTodoBusyId(todo._id)
    const snapshot = todos
    setTodos((prev) => prev.filter((t) => t._id !== todo._id))
    try {
      await apiClient.deleteTodo(todo._id)
    } catch (e: unknown) {
      setTodos(snapshot)
      setTodoError(getErrorMessage(e) || "Failed to delete todo.")
    } finally {
      setTodoBusyId(null)
    }
  }

  const openNewNote = () => {
    setEditingNote(null)
    setNoteForm({ title: "", content: "", color: "yellow", pinned: false })
    setNoteError("")
    setNoteModalOpen(true)
  }

  const openEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteForm({
      title: note.title || "",
      content: note.content || "",
      color: note.color || "yellow",
      pinned: Boolean(note.pinned),
    })
    setNoteError("")
    setNoteModalOpen(true)
  }

  const saveNote = async () => {
    const payload = {
      title: noteForm.title.trim(),
      content: noteForm.content.trim(),
      color: noteForm.color,
      pinned: noteForm.pinned,
    }
    if (!payload.content) {
      setNoteError("Please write something for your note.")
      return
    }

    setNoteError("")
    setNoteBusyId(editingNote?._id || "new")
    try {
      if (editingNote?._id) {
        const res = await apiClient.updateStickyNote(editingNote._id, payload)
        const updated = res?.note
        if (updated?._id) {
          setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)))
        } else {
          await fetchAll()
        }
      } else {
        const res = await apiClient.createStickyNote(payload)
        const created = res?.note
        if (created?._id) setNotes((prev) => [created, ...prev])
        else await fetchAll()
      }

      setNoteModalOpen(false)
      setEditingNote(null)
    } catch (e: unknown) {
      setNoteError(getErrorMessage(e) || "Failed to save note.")
    } finally {
      setNoteBusyId(null)
    }
  }

  const togglePin = async (note: Note) => {
    setNoteBusyId(note._id)
    const nextPinned = !Boolean(note.pinned)
    const snapshot = notes
    setNotes((prev) => prev.map((n) => (n._id === note._id ? { ...n, pinned: nextPinned } : n)))
    try {
      const res = await apiClient.updateStickyNote(note._id, { pinned: nextPinned })
      const updated = res?.note
      if (updated?._id) setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)))
    } catch (e: unknown) {
      setNotes(snapshot)
      setNoteError(getErrorMessage(e) || "Failed to pin note.")
    } finally {
      setNoteBusyId(null)
    }
  }

  const deleteNote = async (note: Note) => {
    if (!confirm("Delete this sticky note?")) return
    setNoteError("")
    setNoteBusyId(note._id)
    const snapshot = notes
    setNotes((prev) => prev.filter((n) => n._id !== note._id))
    try {
      await apiClient.deleteStickyNote(note._id)
    } catch (e: unknown) {
      setNotes(snapshot)
      setNoteError(getErrorMessage(e) || "Failed to delete note.")
    } finally {
      setNoteBusyId(null)
    }
  }

  return (
    <ModernMainLayout>
      <div className="space-y-6">
        <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">To‑do & Sticky Notes</h1>
              <p className="text-white/80 mt-2">
                Quick personal tasks + colorful notes. Lightweight, fast, and always yours.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur border border-white/15">
                <div className="text-xs uppercase tracking-wide text-white/70">To‑dos</div>
                <div className="font-bold">{stats.open} open • {stats.done} done</div>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur border border-white/15">
                <div className="text-xs uppercase tracking-wide text-white/70">Notes</div>
                <div className="font-bold">{stats.notes} total • {stats.pinned} pinned</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all",
                tab === "todo"
                  ? "bg-white text-slate-900 border-white shadow"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/15",
              )}
              onClick={() => setTab("todo")}
              type="button"
            >
              <ClipboardList className="h-4 w-4" />
              To‑do
            </button>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all",
                tab === "sticky"
                  ? "bg-white text-slate-900 border-white shadow"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/15",
              )}
              onClick={() => setTab("sticky")}
              type="button"
            >
              <StickyNote className="h-4 w-4" />
              Sticky Notes
            </button>
          </div>
        </div>

        {tab === "todo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ModernCard className="lg:col-span-1 border-0 shadow-lg">
              <ModernCardHeader>
                <ModernCardTitle className="flex items-center justify-between">
                  <span>New To‑do</span>
                  <span className="text-xs text-gray-500">{stats.total} total</span>
                </ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-4">
                {todoError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    {todoError}
                  </div>
                )}
                <ModernInput
                  label="What do you want to do?"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="e.g., Send invoice to client"
                />
                <ModernButton
                  className="w-full"
                  onClick={addTodo}
                  loading={todoBusyId === "new"}
                  disabled={!newTodoText.trim() || todoBusyId === "new"}
                >
                  <Plus className="h-4 w-4" />
                  Add To‑do
                </ModernButton>
                <div className="text-xs text-gray-500">
                  Tip: keep it short—this is for quick personal reminders.
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard className="lg:col-span-2 border-0 shadow-lg">
              <ModernCardHeader>
                <ModernCardTitle>Your List</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                {loading ? (
                  <div className="text-gray-500">Loading…</div>
                ) : todos.length === 0 ? (
                  <div className="text-gray-500">
                    No to‑dos yet. Add one on the left.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todos.map((t) => (
                      <div
                        key={t._id}
                        draggable
                        onDragStart={() => setDraggingTodoId(t._id)}
                        onDragEnd={() => setDraggingTodoId(null)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (!draggingTodoId || draggingTodoId === t._id) return
                          setTodos((prev) => {
                            const fromIdx = prev.findIndex((x) => x._id === draggingTodoId)
                            const toIdx = prev.findIndex((x) => x._id === t._id)
                            if (fromIdx < 0 || toIdx < 0) return prev
                            const next = [...prev]
                            const [moved] = next.splice(fromIdx, 1)
                            next.splice(toIdx, 0, moved)
                            return next
                          })
                        }}
                        onDrop={async () => {
                          const orderedIds = todos.map((x) => x._id)
                          try {
                            await apiClient.reorderTodos(orderedIds)
                          } catch (e: unknown) {
                            setTodoError(getErrorMessage(e) || "Failed to save order.")
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border shadow-sm transition-colors",
                          draggingTodoId === t._id && "opacity-60",
                          t.done ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-200 hover:bg-gray-50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTodo(t)}
                          disabled={todoBusyId === t._id}
                          className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors",
                            t.done ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-200",
                          )}
                          title={t.done ? "Mark as not done" : "Mark as done"}
                        >
                          {t.done ? <Check className="h-5 w-5" /> : <div className="h-5 w-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium truncate", t.done && "line-through text-emerald-700")}>
                            {t.text}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ModernButton
                            type="button"
                            variant="outline"
                            onClick={() => deleteTodo(t)}
                            disabled={todoBusyId === t._id}
                            className="rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ModernButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {tab === "sticky" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900">Sticky Notes</div>
                <div className="text-sm text-gray-600">Write quick notes and keep important ones pinned.</div>
              </div>
              <ModernButton onClick={openNewNote} className="rounded-2xl">
                <Plus className="h-4 w-4" />
                New Note
              </ModernButton>
            </div>

            {noteError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                {noteError}
              </div>
            )}

            {loading ? (
              <div className="text-gray-500">Loading…</div>
            ) : notes.length === 0 ? (
              <ModernCard className="border-0 shadow-lg">
                <ModernCardContent className="py-10 text-center text-gray-600">
                  No sticky notes yet. Create your first one.
                </ModernCardContent>
              </ModernCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {notes.map((n) => (
                  <div
                    key={n._id}
                    draggable
                    onDragStart={() => setDraggingNoteId(n._id)}
                    onDragEnd={() => setDraggingNoteId(null)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!draggingNoteId || draggingNoteId === n._id) return
                      setNotes((prev) => {
                        const fromIdx = prev.findIndex((x) => x._id === draggingNoteId)
                        const toIdx = prev.findIndex((x) => x._id === n._id)
                        if (fromIdx < 0 || toIdx < 0) return prev
                        const next = [...prev]
                        const [moved] = next.splice(fromIdx, 1)
                        next.splice(toIdx, 0, moved)
                        return next
                      })
                    }}
                    onDrop={async () => {
                      const orderedIds = notes.map((x) => x._id)
                      try {
                        await apiClient.reorderStickyNotes(orderedIds)
                      } catch (e: unknown) {
                        setNoteError(getErrorMessage(e) || "Failed to save order.")
                      }
                    }}
                    className={cn(
                      "relative rounded-3xl border p-5 shadow-lg overflow-hidden",
                      draggingNoteId === n._id && "opacity-60",
                      colorClasses(n.color),
                    )}
                    onClick={() => {
                      setEditingNoteId(n._id)
                      ensureDraft(n)
                    }}
                  >
                    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/30" />
                    <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-white/25" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {editingNoteId === n._id ? (
                            <input
                              value={noteDrafts[n._id]?.title ?? ""}
                              onChange={(e) => {
                                const v = e.target.value
                                setNoteDrafts((p) => ({
                                  ...p,
                                  [n._id]: { ...(p[n._id] || { title: "", content: "", color: "yellow", pinned: false }), title: v },
                                }))
                                queueNoteSave(n._id)
                              }}
                              placeholder="Title…"
                              className="w-full bg-white/40 border border-white/40 rounded-2xl px-3 py-2 text-sm font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="font-extrabold text-gray-900 truncate">
                              {n.title?.trim() ? n.title : "Untitled"}
                            </div>
                          )}
                          {n.pinned && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                              <Pin className="h-3.5 w-3.5" />
                              Pinned
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => togglePin(n)}
                            disabled={noteBusyId === n._id}
                            className="h-9 w-9 rounded-2xl bg-white/60 hover:bg-white/80 border border-white/50 flex items-center justify-center"
                            title={n.pinned ? "Unpin" : "Pin"}
                          >
                            <Pin className={cn("h-4 w-4", n.pinned ? "text-gray-900" : "text-gray-700")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote(n)}
                            disabled={noteBusyId === n._id}
                            className="h-9 w-9 rounded-2xl bg-white/60 hover:bg-white/80 border border-white/50 flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>
                      </div>

                      {editingNoteId === n._id && (
                        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl bg-white/70 border border-white/60 text-sm font-semibold hover:bg-white/85"
                            onClick={() => {
                              contentRefs.current[n._id]?.focus()
                              document.execCommand("bold")
                              queueNoteSave(n._id)
                            }}
                            title="Bold"
                          >
                            <Bold className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl bg-white/70 border border-white/60 text-sm font-semibold hover:bg-white/85"
                            onClick={() => {
                              contentRefs.current[n._id]?.focus()
                              document.execCommand("italic")
                              queueNoteSave(n._id)
                            }}
                            title="Italic"
                          >
                            <Italic className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl bg-white/70 border border-white/60 text-sm font-semibold hover:bg-white/85"
                            onClick={() => {
                              contentRefs.current[n._id]?.focus()
                              document.execCommand("underline")
                              queueNoteSave(n._id)
                            }}
                            title="Underline"
                          >
                            <Underline className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl bg-white/70 border border-white/60 text-sm font-semibold hover:bg-white/85"
                            onClick={() => {
                              contentRefs.current[n._id]?.focus()
                              document.execCommand("strikeThrough")
                              queueNoteSave(n._id)
                            }}
                            title="Strikethrough"
                          >
                            <Strikethrough className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl bg-white/70 border border-white/60 text-sm font-semibold hover:bg-white/85"
                            onClick={() => {
                              contentRefs.current[n._id]?.focus()
                              document.execCommand("insertUnorderedList")
                              queueNoteSave(n._id)
                            }}
                            title="Bullets"
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {editingNoteId === n._id ? (
                        <div
                          ref={(el) => {
                            contentRefs.current[n._id] = el
                          }}
                          className={cn(
                            "mt-4 text-gray-800 break-words rounded-2xl border border-white/40 bg-white/35 px-3 py-2 min-h-[120px] outline-none",
                            "focus:ring-2 focus:ring-slate-900/10",
                          )}
                          contentEditable
                          suppressContentEditableWarning
                          onClick={(e) => e.stopPropagation()}
                          onInput={(e) => {
                            const html = (e.currentTarget as HTMLDivElement).innerHTML
                            setNoteDrafts((p) => ({
                              ...p,
                              [n._id]: { ...(p[n._id] || { title: "", content: "", color: "yellow", pinned: false }), content: html },
                            }))
                            queueNoteSave(n._id)
                          }}
                          onBlur={() => {
                            void flushNoteSave(n._id)
                          }}
                        />
                      ) : (
                        <div
                          className="mt-4 text-gray-800 break-words line-clamp-8 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: n.content }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>New Note</DialogTitle>
                </DialogHeader>

                {noteError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    {noteError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModernInput
                    label="Title (optional)"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Client meeting points"
                  />

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Color</div>
                    <div className="flex flex-wrap gap-2">
                      {noteColors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={cn(
                            "px-3 py-2 rounded-2xl border text-sm font-semibold transition-all",
                            c.bg,
                            c.border,
                            noteForm.color === c.id ? "ring-2 ring-slate-900/30" : "hover:brightness-95",
                          )}
                          onClick={() => setNoteForm((p) => ({ ...p, color: c.id }))}
                        >
                          {c.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-2 rounded-2xl border text-sm font-semibold transition-all bg-white border-gray-200",
                          noteForm.pinned ? "ring-2 ring-slate-900/20" : "hover:bg-gray-50",
                        )}
                        onClick={() => setNoteForm((p) => ({ ...p, pinned: !p.pinned }))}
                        title="Pin note"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Pin className="h-4 w-4" />
                          {noteForm.pinned ? "Pinned" : "Pin"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Note</div>
                  <textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Write anything…"
                    rows={8}
                    className={cn(
                      "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none",
                      "focus:ring-2 focus:ring-pink-500/30 focus:border-pink-300",
                    )}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <ModernButton
                    className="flex-1 rounded-2xl"
                    onClick={saveNote}
                    loading={noteBusyId === "new"}
                    disabled={noteBusyId === "new"}
                  >
                    Create Note
                  </ModernButton>
                  <ModernButton variant="outline" className="flex-1 rounded-2xl" onClick={() => setNoteModalOpen(false)}>
                    Cancel
                  </ModernButton>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </ModernMainLayout>
  )
}

