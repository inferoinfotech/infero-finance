"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { apiClient } from "@/lib/api"

interface Account {
  _id: string
  name: string
  type: "bank" | "wallet"
}
interface HourlyWork {
  _id: string
  weekStart: string // <-- date field for log
  hours: number
  billed: boolean
}
interface Project {
  _id: string
  priceType: "fixed" | "hourly"
  hourlyRate?: number
  currency: string
}
interface AddPaymentModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddPaymentModal({ projectId, isOpen, onClose, onSuccess }: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [hourlyWorkOptions, setHourlyWorkOptions] = useState<HourlyWork[]>([])
  const [formData, setFormData] = useState({
    amount: "",
    platformCharge: "",
    conversionRate: "",
    paymentDate: new Date().toISOString().split("T")[0],
    platformWallet: "",
    walletStatus: "pending",
    walletReceivedDate: "",
    bankAccount: "",
    bankStatus: "pending",
    bankTransferDate: "",
    notes: "",
    hoursBilled: "",
    hourlyWorkEntries: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset formData each time modal/project changes
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        amount: "",
        platformCharge: "",
        conversionRate: "",
        paymentDate: new Date().toISOString().split("T")[0],
        platformWallet: "",
        walletStatus: "pending",
        walletReceivedDate: "",
        bankAccount: "",
        bankStatus: "pending",
        bankTransferDate: "",
        notes: "",
        hoursBilled: "",
        hourlyWorkEntries: [],
      })
    }
  }, [isOpen, project])

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
      fetchProject()
    }
  }, [isOpen])
  useEffect(() => {
    if (project && project.priceType === "hourly") fetchHourlyWork()
  }, [project])

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : (Array.isArray(data.accounts) ? data.accounts : []))
    } catch {
      setAccounts([])
    }
  }
  const fetchProject = async () => {
    try {
      const data = await apiClient.getProject(projectId)
      setProject(data.project ? data.project : data)
    } catch {
      setProject(null)
    }
  }
  const fetchHourlyWork = async () => {
    try {
      const data = await apiClient.getHourlyWorkEntries(projectId)
      setHourlyWorkOptions(Array.isArray(data) ? data : [])
    } catch {
      setHourlyWorkOptions([])
    }
  }

  // Auto-calc for hourly payment
  useEffect(() => {
    if (project?.priceType === "hourly") {
      const hours = Number(formData.hoursBilled)
      const platformCharge = Number(formData.platformCharge) || 0
      const rate = Number(project.hourlyRate) || 0
      if (hours && rate) {
        setFormData((f) => ({
          ...f,
          amount: (hours * rate - platformCharge > 0 ? (hours * rate - platformCharge).toFixed(2) : "0"),
        }))
      }
    }
    // eslint-disable-next-line
  }, [formData.hoursBilled, formData.platformCharge, project?.hourlyRate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Amount is required"
    if (!formData.platformCharge) newErrors.platformCharge = "Platform charge is required"
    if (!formData.conversionRate) newErrors.conversionRate = "Conversion rate is required"
    if (!formData.paymentDate) newErrors.paymentDate = "Payment date is required"
    if (!formData.platformWallet) newErrors.platformWallet = "Select wallet account"
    if (!formData.walletStatus) newErrors.walletStatus = "Wallet status is required"
    if (!formData.bankStatus) newErrors.bankStatus = "Bank status is required"
    if (project && project.priceType === "hourly") {
      if (!formData.hoursBilled || Number(formData.hoursBilled) <= 0) newErrors.hoursBilled = "Hours billed is required"
      if (!formData.hourlyWorkEntries.length) newErrors.hourlyWorkEntries = "Select at least one hourly work entry"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const amount = Number(formData.amount)
      const platformCharge = Number(formData.platformCharge)
      const conversionRate = Number(formData.conversionRate)
      // Compute INR amount
      const amountInINR = ((amount - platformCharge) * conversionRate).toFixed(2)
      const payload: any = {
        project: projectId,
        amount,
        platformCharge,
        conversionRate,
        amountInINR: Number(amountInINR),
        paymentDate: formData.paymentDate,
        platformWallet: formData.platformWallet,
        walletStatus: formData.walletStatus,
        walletReceivedDate: formData.walletReceivedDate || undefined,
        notes: formData.notes,
        bankStatus: formData.bankStatus,
        bankTransferDate: formData.bankTransferDate || undefined,
      }
      if (formData.bankAccount) payload.bankAccount = formData.bankAccount
      if (project && project.priceType === "hourly") {
        payload.hoursBilled = Number(formData.hoursBilled)
        payload.hourlyWorkEntries = formData.hourlyWorkEntries
      }
      await apiClient.createProjectPayment(payload)
      setFormData({
        amount: "",
        platformCharge: "",
        conversionRate: "",
        paymentDate: new Date().toISOString().split("T")[0],
        platformWallet: "",
        walletStatus: "pending",
        walletReceivedDate: "",
        bankAccount: "",
        bankStatus: "pending",
        bankTransferDate: "",
        notes: "",
        hoursBilled: "",
        hourlyWorkEntries: [],
      })
      setErrors({})
      onSuccess()
      onClose()
    } catch (error) {
      setErrors({ submit: "Failed to create payment. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, multiple, options } = e.target
    if (type === "select-multiple") {
      const selected: string[] = []
      for (let i = 0; i < options.length; i++) {
        if ((options[i] as any).selected) selected.push(options[i].value)
      }
      setFormData((f) => ({ ...f, [name]: selected }))
    } else {
      setFormData((f) => ({ ...f, [name]: value }))
    }
    if (errors[name]) setErrors({ ...errors, [name]: "" })
  }

  if (!isOpen) return null
  if (!project) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Loading Project Details...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Add Payment</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{errors.submit}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AMOUNT (readonly for hourly) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  className={errors.amount ? "border-red-500" : ""}
                  readOnly={project.priceType === "hourly"}
                />
                {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
              </div>
              {/* PLATFORM CHARGE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform Charge *</label>
                <Input
                  name="platformCharge"
                  type="number"
                  step="0.01"
                  value={formData.platformCharge}
                  onChange={handleChange}
                  placeholder="e.g., 10"
                  className={errors.platformCharge ? "border-red-500" : ""}
                />
                {errors.platformCharge && <p className="text-sm text-red-600">{errors.platformCharge}</p>}
              </div>
              {/* CONVERSION RATE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Conversion Rate *</label>
                <Input
                  name="conversionRate"
                  type="number"
                  step="0.01"
                  value={formData.conversionRate}
                  onChange={handleChange}
                  placeholder="e.g., 83.5"
                  className={errors.conversionRate ? "border-red-500" : ""}
                />
                {errors.conversionRate && <p className="text-sm text-red-600">{errors.conversionRate}</p>}
              </div>
              {/* PAYMENT DATE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Date *</label>
                <Input
                  name="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className={errors.paymentDate ? "border-red-500" : ""}
                />
                {errors.paymentDate && <p className="text-sm text-red-600">{errors.paymentDate}</p>}
              </div>
              {/* WALLET */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Account *</label>
                <select
                  name="platformWallet"
                  value={formData.platformWallet}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.platformWallet ? "border-red-500" : "border-gray-300"}`}
                  required
                >
                  <option value="">Select Wallet Account</option>
                  {accounts.filter(acc => acc.type === "wallet").map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                {errors.platformWallet && <p className="text-sm text-red-600">{errors.platformWallet}</p>}
              </div>
              {/* WALLET STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Status *</label>
                <select
                  name="walletStatus"
                  value={formData.walletStatus}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.walletStatus ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="pending">Pending</option>
                  <option value="on_hold">On Hold</option>
                  <option value="released">Released</option>
                </select>
                {errors.walletStatus && <p className="text-sm text-red-600">{errors.walletStatus}</p>}
              </div>
              {/* BANK */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Account</label>
                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bank Account (Optional)</option>
                  {accounts.filter(acc => acc.type === "bank").map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
              {/* BANK STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Status *</label>
                <select
                  name="bankStatus"
                  value={formData.bankStatus}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bankStatus ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="pending">Pending</option>
                  <option value="released">Released</option>
                </select>
                {errors.bankStatus && <p className="text-sm text-red-600">{errors.bankStatus}</p>}
              </div>
              {/* HOURLY FIELDS */}
              {project && project.priceType === "hourly" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hours Billed *</label>
                    <Input
                      name="hoursBilled"
                      type="number"
                      step="0.1"
                      value={formData.hoursBilled}
                      onChange={handleChange}
                      placeholder="Total hours for this payment"
                      className={errors.hoursBilled ? "border-red-500" : ""}
                    />
                    {errors.hoursBilled && <p className="text-sm text-red-600">{errors.hoursBilled}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Hourly Work Entries *</label>
                    <select
                      name="hourlyWorkEntries"
                      multiple
                      value={formData.hourlyWorkEntries}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.hourlyWorkEntries ? "border-red-500" : "border-gray-300"}`}
                    >
                      {hourlyWorkOptions
                        .filter(e => !e.billed)
                        .map(entry => (
                          <option key={entry._id} value={entry._id}>
                            {entry.weekStart} - {entry.hours} hrs
                          </option>
                        ))}
                    </select>
                    {errors.hourlyWorkEntries && <p className="text-sm text-red-600">{errors.hourlyWorkEntries}</p>}
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes about this payment"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Adding Payment..." : "Add Payment"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
