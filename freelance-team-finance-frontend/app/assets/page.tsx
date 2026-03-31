"use client"

import { useEffect, useMemo, useState } from "react"
import { ModernMainLayout } from "@/components/modern-main-layout"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernInput } from "@/components/ui/modern-input"
import { ModernSelect } from "@/components/ui/modern-select"
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card"
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/components/ui/modern-table"
import { ModernBadge } from "@/components/ui/modern-badge"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Plus, Edit, Trash2, Building2, DollarSign, ClipboardList, Search, X, Calendar, Layers, TrendingUp } from "lucide-react"

interface Account {
  _id: string
  type: "bank" | "wallet" | string
  name: string
  balance?: number
}

interface Asset {
  _id: string
  name: string
  type: string
  accountType: "bank" | "wallet"
  account?: Account
  note?: string
  amount: number
  currentValue: number
  createdAt?: string
}

interface AssetType {
  _id: string
  name: string
  description?: string
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [showAddType, setShowAddType] = useState(false)
  const [typeErrors, setTypeErrors] = useState<Record<string, string>>({})
  const [typeSubmitting, setTypeSubmitting] = useState(false)
  const [assetTypeForm, setAssetTypeForm] = useState({ name: "", description: "" })

  const [filters, setFilters] = useState({
    searchTerm: "",
    type: "",
    accountType: "",
    accountId: "",
    fromDate: "",
    toDate: "",
  })

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    accountType: "bank" as "bank" | "wallet",
    accountId: "",
    note: "",
    amount: "",
    currentValue: "",
  })

  const accountOptions = useMemo(() => {
    return accounts
      .filter((a) => a.type === formData.accountType)
      .map((a) => ({
        value: a._id,
        label: `${a.name} (Balance: ₹${(a.balance || 0).toLocaleString("en-IN")})`,
      }))
  }, [accounts, formData.accountType])

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : data?.accounts || [])
    } catch (err) {
      console.error("Failed to fetch accounts:", err)
      setAccounts([])
    }
  }

  const fetchAssetTypes = async () => {
    try {
      const data = await apiClient.getAssetTypes()
      setAssetTypes(Array.isArray(data?.types) ? data.types : [])
    } catch (err) {
      console.error("Failed to fetch asset types:", err)
      setAssetTypes([])
    }
  }

  const fetchAssets = async () => {
    try {
      const data = await apiClient.getAssets()
      const assetsArr = Array.isArray(data) ? data : data?.assets || []
      setAssets(assetsArr)
    } catch (err) {
      console.error("Failed to fetch assets:", err)
      setAssets([])
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        await Promise.all([fetchAccounts(), fetchAssets(), fetchAssetTypes()])
      } catch (err) {
        console.error("Failed to load assets page data:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Asset name is required"
    if (!formData.type.trim()) newErrors.type = "Asset type is required"
    if (!formData.accountType) newErrors.accountType = "Account type is required"
    if (!formData.accountId) newErrors.accountId = "Please select an account"

    const amountNum = Number(formData.amount)
    if (!formData.amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      newErrors.amount = "Amount must be greater than 0"
    }

    const curNum = Number(formData.currentValue)
    if (!formData.currentValue || !Number.isFinite(curNum) || curNum < 0) {
      newErrors.currentValue = "Current value must be >= 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setEditingAsset(null)
    setErrors({})
    setSubmitting(false)
    setFormData({
      name: "",
      type: "",
      accountType: "bank",
      accountId: "",
      note: "",
      amount: "",
      currentValue: "",
    })
  }

  const selectedAssetType = useMemo(
    () => assetTypes.find((t) => t.name === formData.type),
    [assetTypes, formData.type]
  )

  const totals = useMemo(() => {
    const totalAssets = assets.length
    const totalInvestment = assets.reduce((sum, a) => sum + (a.amount || 0), 0)
    const totalCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0)
    const netValue = totalCurrentValue - totalInvestment
    return { totalAssets, totalInvestment, totalCurrentValue, netValue }
  }, [assets])

  const filteredAssets = useMemo(() => {
    const { searchTerm, type, accountType, accountId, fromDate, toDate } = filters

    const fromTs = fromDate ? new Date(fromDate).getTime() : null
    const toTs = toDate ? new Date(toDate).getTime() : null

    return assets.filter((a) => {
      const matchesSearch =
        !searchTerm ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.note || "").toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = !type || a.type === type
      const matchesAccountType = !accountType || (a.account?.type || a.accountType) === accountType
      const matchesAccount = !accountId || a.account?._id === accountId

      const assetTs = a.createdAt ? new Date(a.createdAt).getTime() : null
      const matchesFrom = fromTs === null || (assetTs !== null && assetTs >= fromTs)
      const matchesTo = toTs === null || (assetTs !== null && assetTs <= toTs)

      return matchesSearch && matchesType && matchesAccountType && matchesAccount && matchesFrom && matchesTo
    })
  }, [assets, filters])

  const resetTypeForm = () => {
    setAssetTypeForm({ name: "", description: "" })
    setTypeErrors({})
    setTypeSubmitting(false)
  }

  const handleAddType = async () => {
    if (!assetTypeForm.name.trim()) {
      setTypeErrors({ name: "Type name is required" })
      return
    }

    setTypeSubmitting(true)
    try {
      await apiClient.createAssetType({
        name: assetTypeForm.name.trim(),
        description: assetTypeForm.description || "",
      })

      await (async () => {
        const data = await apiClient.getAssetTypes()
        setAssetTypes(Array.isArray(data?.types) ? data.types : [])
      })()

      setShowAddType(false)
      setFormData((prev) => ({ ...prev, type: assetTypeForm.name.trim() }))
      resetTypeForm()
    } catch (err: any) {
      console.error(err)
      setTypeErrors({ submit: err?.message || "Failed to create type" })
      setTypeSubmitting(false)
    }
  }

  const handleDeleteType = async () => {
    if (!selectedAssetType) return

    if (!window.confirm(`Delete asset type "${selectedAssetType.name}"? It cannot be deleted if assets are using it.`)) {
      return
    }

    try {
      await apiClient.deleteAssetType(selectedAssetType._id)
      await (async () => {
        const data = await apiClient.getAssetTypes()
        setAssetTypes(Array.isArray(data?.types) ? data.types : [])
      })()
      setFormData((prev) => ({ ...prev, type: "" }))
    } catch (err: any) {
      console.error(err)
      alert(err?.message || "Failed to delete type")
    }
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      type: "",
      accountType: "",
      accountId: "",
      fromDate: "",
      toDate: "",
    })
  }

  const handleOpenAdd = () => {
    resetForm()
    setShowAddForm(true)
  }

  const handleEdit = (asset: Asset) => {
    const accountId =
      typeof asset.account === "object" ? asset.account?._id || "" : (asset as any).accountId || ""

    setErrors({})
    setEditingAsset(asset)
    setFormData({
      name: asset.name || "",
      type: asset.type || "",
      accountType: asset.accountType || "bank",
      accountId: accountId || "",
      note: asset.note || "",
      amount: asset.amount != null ? String(asset.amount) : "",
      currentValue: asset.currentValue != null ? String(asset.currentValue) : "",
    })
    setShowAddForm(true)
  }

  const handleDelete = async (assetId: string, assetName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${assetName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteAsset(assetId)
      setAssets((prev) => prev.filter((a) => a._id !== assetId))
      // Refresh balances for better UX in dropdown labels
      fetchAccounts()
    } catch (err: any) {
      console.error("Failed to delete asset:", err)
      alert(err?.message || "Failed to delete asset")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        accountType: formData.accountType,
        accountId: formData.accountId,
        note: formData.note || "",
        amount: Number(formData.amount),
        currentValue: Number(formData.currentValue),
      }

      if (editingAsset) {
        await apiClient.updateAsset(editingAsset._id, payload)
      } else {
        await apiClient.createAsset(payload)
      }

      setShowAddForm(false)
      resetForm()
      await fetchAssets()
      await fetchAccounts()
    } catch (err: any) {
      console.error("Failed to save asset:", err)
      setErrors({ submit: err?.message || "Failed to save asset" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <ModernMainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <LoadingSkeleton width={300} height={40} />
            <LoadingSkeleton width={140} height={40} />
          </div>
          <LoadingSkeleton variant="card" height={520} />
        </div>
      </ModernMainLayout>
    )
  }

  return (
    <ModernMainLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Assets Management</h1>
            <p className="text-gray-600 text-lg">Track assets and their account impact</p>
          </div>
          <ModernButton onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </ModernButton>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Total Assets</div>
                <div className="text-3xl font-bold">{totals.totalAssets}</div>
              </div>
              <Layers className="h-8 w-8 text-white/80" />
            </div>
          </div>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ModernCardTitle className="text-lg">Current Value</ModernCardTitle>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{totals.totalCurrentValue.toLocaleString("en-IN")}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ModernCardTitle className="text-lg">Total Investment</ModernCardTitle>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{totals.totalInvestment.toLocaleString("en-IN")}
              </div>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ModernCardTitle className="text-lg">Net Value</ModernCardTitle>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className={cn("text-2xl font-bold", totals.netValue >= 0 ? "text-green-600" : "text-red-600")}>
                ₹{totals.netValue.toLocaleString("en-IN")}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Filters */}
        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filters
              </ModernCardTitle>
              {(filters.searchTerm || filters.type || filters.accountType || filters.accountId || filters.fromDate || filters.toDate) ? (
                <ModernButton variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </ModernButton>
              ) : null}
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            <div className="p-6 space-y-4">
              <ModernInput
                label="Search by name / note"
                placeholder="Search assets..."
                value={filters.searchTerm}
                onChange={(e) => setFilters((p) => ({ ...p, searchTerm: e.target.value }))}
                icon={<Search className="h-4 w-4" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ModernSelect
                  label="Type"
                  value={filters.type}
                  onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
                  options={[
                    { value: "", label: "All Types" },
                    ...assetTypes.map((t) => ({ value: t.name, label: t.name })),
                  ]}
                />

                <ModernSelect
                  label="Account Type"
                  value={filters.accountType}
                  onChange={(e) => {
                    const v = e.target.value
                    setFilters((p) => ({ ...p, accountType: v, accountId: "" }))
                  }}
                  options={[
                    { value: "", label: "All Account Types" },
                    { value: "bank", label: "Bank" },
                    { value: "wallet", label: "Wallet" },
                  ]}
                />

                <ModernSelect
                  label="Account"
                  value={filters.accountId}
                  onChange={(e) => setFilters((p) => ({ ...p, accountId: e.target.value }))}
                  options={[
                    { value: "", label: "All Accounts" },
                    ...(filters.accountType
                      ? accounts
                          .filter((a) => a.type === filters.accountType)
                          .map((a) => ({ value: a._id, label: a.name }))
                      : accounts.map((a) => ({ value: a._id, label: `${a.name} (${a.type})` }))),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModernInput
                  label="From Date"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))}
                  icon={<Calendar className="h-4 w-4" />}
                />
                <ModernInput
                  label="To Date"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard>
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <ModernCardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Asset List
              </ModernCardTitle>
              <ModernBadge variant="secondary">
                {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
              </ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardContent className="p-0">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No assets found</p>
                <p className="text-gray-400">Try adjusting filters or add an asset</p>
              </div>
            ) : (
              <ModernTable>
                <ModernTableHeader>
                  <ModernTableRow>
                    <ModernTableHead>Asset</ModernTableHead>
                    <ModernTableHead>Type</ModernTableHead>
                    <ModernTableHead>Account</ModernTableHead>
                    <ModernTableHead>Note</ModernTableHead>
                    <ModernTableHead>Amount</ModernTableHead>
                    <ModernTableHead>Current Value</ModernTableHead>
                    <ModernTableHead className="text-right">Actions</ModernTableHead>
                  </ModernTableRow>
                </ModernTableHeader>
                <ModernTableBody>
                  {filteredAssets.map((asset) => {
                    const accountName = asset.account?.name || "—"
                    const accountType = asset.accountType || asset.account?.type || "—"
                    return (
                      <ModernTableRow key={asset._id}>
                        <ModernTableCell>
                          <div className="font-semibold text-gray-900">{asset.name}</div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <span className="text-gray-700">{asset.type}</span>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="text-gray-600">
                            {accountName}{" "}
                            <span className="text-gray-400">({String(accountType)})</span>
                          </div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="text-gray-600 max-w-[260px] truncate">{asset.note || "—"}</div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="font-semibold text-lg text-red-600">-₹{asset.amount.toLocaleString("en-IN")}</div>
                        </ModernTableCell>
                        <ModernTableCell>
                          <div className="font-semibold text-gray-900">₹{asset.currentValue.toLocaleString("en-IN")}</div>
                        </ModernTableCell>
                        <ModernTableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <ModernButton variant="outline" size="sm" onClick={() => handleEdit(asset)}>
                              <Edit className="h-4 w-4" />
                            </ModernButton>
                            <ModernButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(asset._id, asset.name)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ModernButton>
                          </div>
                        </ModernTableCell>
                      </ModernTableRow>
                    )
                  })}
                </ModernTableBody>
              </ModernTable>
            )}
          </ModernCardContent>
        </ModernCard>

        <Dialog
          open={showAddForm}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddForm(false)
              resetForm()
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingAsset ? "Edit Asset" : "Add New Asset"}
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
                  label="Asset Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter asset name"
                  error={errors.name}
                />

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Type *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        className={cn(
                          "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200",
                          "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
                          errors.type && "border-red-300 focus:border-red-500 focus:ring-red-500/20",
                          "appearance-none cursor-pointer"
                        )}
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="" disabled>
                          Select Type
                        </option>
                        {formData.type && !assetTypes.some((t) => t.name === formData.type) ? (
                          <option value={formData.type}>{formData.type}</option>
                        ) : null}
                        {assetTypes.map((t) => (
                          <option key={t._id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {formData.type && selectedAssetType ? (
                      <ModernButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteType}
                        className="h-12 px-4 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        title="Delete type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ModernButton>
                    ) : (
                      <ModernButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddType(true)
                          setTypeErrors({})
                        }}
                        className="h-12 px-4"
                        title="Add new type"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </ModernButton>
                    )}
                  </div>
                  {errors.type ? <p className="text-xs text-red-500 mt-1">{errors.type}</p> : null}
                </div>

                <ModernSelect
                  label="Account Type"
                  value={formData.accountType}
                  onChange={(e) => {
                    const nextType = e.target.value as "bank" | "wallet"
                    setFormData({ ...formData, accountType: nextType, accountId: "" })
                    if (errors.accountType || errors.accountId) setErrors((prev) => ({ ...prev, accountType: "", accountId: "" }))
                  }}
                  options={[
                    { value: "bank", label: "Bank Account" },
                    { value: "wallet", label: "Digital Wallet" },
                  ]}
                  error={errors.accountType}
                />

                <ModernSelect
                  label="Account"
                  value={formData.accountId}
                  onChange={(e) => {
                    setFormData({ ...formData, accountId: e.target.value })
                    if (errors.accountId) setErrors((prev) => ({ ...prev, accountId: "" }))
                  }}
                  options={[
                    { value: "", label: "Select Account" },
                    ...accountOptions,
                  ]}
                  error={errors.accountId}
                />

                <ModernInput
                  label="Amount (debit)"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  icon={<DollarSign className="h-4 w-4" />}
                  error={errors.amount}
                />

                <ModernInput
                  label="Current Value"
                  type="number"
                  step="0.01"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  placeholder="Enter current value"
                  error={errors.currentValue}
                />

                <div className={cn("md:col-span-2")}>
                  <ModernInput
                    label="Note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Optional note"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <ModernButton type="submit" className="flex-1" loading={submitting} disabled={submitting}>
                  {editingAsset ? "Update Asset" : "Add Asset"}
                </ModernButton>
                <ModernButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </ModernButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Asset Type Modal */}
        <Dialog
          open={showAddType}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddType(false)
              resetTypeForm()
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Asset Type</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {typeErrors.submit ? (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{typeErrors.submit}</div>
              ) : null}

              <ModernInput
                label="Type Name"
                value={assetTypeForm.name}
                onChange={(e) => {
                  setAssetTypeForm((p) => ({ ...p, name: e.target.value }))
                  if (typeErrors.name) setTypeErrors((prev) => ({ ...prev, name: "" }))
                }}
                placeholder="e.g., Laptop, Printer, Furniture"
                error={typeErrors.name}
              />

              <ModernInput
                label="Description (Optional)"
                value={assetTypeForm.description}
                onChange={(e) => setAssetTypeForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description"
              />

              <div className="flex gap-4 pt-4">
                <ModernButton
                  onClick={handleAddType}
                  className="flex-1"
                  loading={typeSubmitting}
                  disabled={typeSubmitting}
                >
                  Add Type
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => {
                    setShowAddType(false)
                    resetTypeForm()
                  }}
                  className="flex-1"
                >
                  Cancel
                </ModernButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModernMainLayout>
  )
}

