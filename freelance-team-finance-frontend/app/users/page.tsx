"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernBadge } from "@/components/ui/modern-badge"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Search, ShieldCheck, User as UserIcon, Mail } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

type Role = "admin" | "owner" | "sales" | "developer"

interface User {
  _id: string
  name: string
  email: string
  role: Role
  createdAt?: string
}

const swrFetcher = (endpoint: string) => apiClient.request(endpoint)

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin",     label: "Admin" },
  { value: "owner",     label: "Owner" },
  { value: "sales",     label: "Sales" },
  { value: "developer", label: "Developer" },
]

export default function UsersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  // Guard
  if (!isAdmin) {
    return (
      <ModernMainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <ModernCard className="max-w-xl w-full">
            <ModernCardHeader>
              <ModernCardTitle className="text-2xl">Not authorized</ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent className="text-gray-600">
              You need admin access to manage users.
            </ModernCardContent>
          </ModernCard>
        </div>
      </ModernMainLayout>
    )
  }

  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ users: User[]; total: number }>(
    `/api/auth/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    swrFetcher
  )

  const users = data?.users || []

  const openEdit = (u: User) => { setSelected(u); setShowEdit(true) }

  const onCreatedOrUpdated = async () => {
    setShowAdd(false)
    setShowEdit(false)
    setSelected(null)
    await mutate()
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Users</h1>
            <p className="text-gray-600 text-lg">Create, edit, and remove users & roles</p>
          </div>
          <ModernButton onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add User
          </ModernButton>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardContent className="p-6">
            <div className="max-w-md">
              <ModernInput
                placeholder="Search by name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Table */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl">All Users</ModernCardTitle>
              <ModernBadge variant="secondary">{users.length}</ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {isLoading ? (
              <div className="p-6"><LoadingSkeleton lines={6} /></div>
            ) : error ? (
              <div className="p-6 text-red-600">Failed to load users.</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No users found</p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Name</ModernTableHead>
                    <ModernTableHead>Email</ModernTableHead>
                    <ModernTableHead>Role</ModernTableHead>
                    <ModernTableHead>Created</ModernTableHead>
                    <ModernTableHead className="text-right">Actions</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {users.map((u) => (
                    <ModernTableRow key={u._id}>
                      <ModernTableCell>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{u.name}</span>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{u.email}</span>
                        </div>
                      </ModernTableCell>
                      <ModernTableCell>
                        <ModernBadge className="capitalize">
                          {u.role}
                        </ModernBadge>
                      </ModernTableCell>
                      <ModernTableCell>
                        <span className="text-gray-600">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </ModernTableCell>
                      <ModernTableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <ModernButton variant="outline" size="sm" onClick={() => openEdit(u)}>
                            <Edit className="h-4 w-4" />
                          </ModernButton>
                          <ModernButton
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            onClick={async () => {
                              if (!confirm(`Delete ${u.name}?`)) return
                              try {
                                await apiClient.deleteUser(u._id)
                                mutate()
                              } catch (e) {
                                alert("Delete failed")
                              }
                            }}
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

        {/* Add Modal */}
        <AddUserModal open={showAdd} onOpenChange={setShowAdd} onSuccess={onCreatedOrUpdated} />

        {/* Edit Modal */}
        {selected && (
          <EditUserModal
            user={selected}
            open={showEdit}
            onOpenChange={(v) => { setShowEdit(v); if (!v) setSelected(null) }}
            onSuccess={onCreatedOrUpdated}
          />
        )}
      </div>
    </ModernMainLayout>
  )
}

/* ---------------- Modals ---------------- */

function AddUserModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v:boolean)=>void; onSuccess: ()=>void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales" as Role })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.name.trim()) e.name = "Name is required"
    if (!form.email.trim()) e.email = "Email is required"
    if (!form.password.trim()) e.password = "Password is required"
    if (!form.role) e.role = "Role is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await apiClient.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      onSuccess()
    } catch (err: any) {
      setErrors({ submit: err?.message || "Failed to create user" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add User</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{errors.submit}</div>
          )}

          <ModernInput
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <ModernInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <ModernInput
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />
          <ModernSelect
            label="Role"
            value={form.role}
            onChange={(e: any) => setForm({ ...form, role: e.target.value })}
            options={ROLE_OPTIONS}
            error={errors.role}
          />

          <div className="flex gap-4 pt-2">
            <ModernButton type="submit" loading={loading} className="flex-1">Create</ModernButton>
            <ModernButton type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </ModernButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserModal({
  user, open, onOpenChange, onSuccess
}: { user: User; open: boolean; onOpenChange: (v:boolean)=>void; onSuccess: ()=>void }) {
  const [form, setForm] = useState<{ name: string; email: string; password?: string; role: Role }>({
    name: user.name, email: user.email, role: user.role, password: ""
  })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: user.name, email: user.email, role: user.role, password: "" })
  }, [open, user])

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.name.trim()) e.name = "Name is required"
    if (!form.email.trim()) e.email = "Email is required"
    if (!form.role) e.role = "Role is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: any = { name: form.name.trim(), email: form.email.trim(), role: form.role }
      if (form.password && form.password.length > 0) payload.password = form.password
      await apiClient.updateUser(user._id, payload)
      onSuccess()
    } catch (err: any) {
      setErrors({ submit: err?.message || "Failed to update user" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{errors.submit}</div>
          )}

          <ModernInput
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <ModernInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <ModernSelect
            label="Role"
            value={form.role}
            onChange={(e: any) => setForm({ ...form, role: e.target.value })}
            options={ROLE_OPTIONS}
            error={errors.role}
          />
          <ModernInput
            label="Reset Password (optional)"
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div className="flex gap-4 pt-2">
            <ModernButton type="submit" loading={loading} className="flex-1">Save</ModernButton>
            <ModernButton type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </ModernButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
