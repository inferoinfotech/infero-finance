"use client";
import { useState, useEffect } from "react";
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card";
import { ModernInput } from "@/components/ui/modern-input";
import { ModernSelect } from "@/components/ui/modern-select";
import { ModernButton } from "@/components/ui/modern-button";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Account {
  _id: string;
  name: string;
  type: "bank" | "wallet";
}
interface HourlyWork {
  _id: string;
  weekStart: string;
  hours: number;
  billed: boolean;
}
interface Project {
  _id: string;
  priceType: "fixed" | "hourly";
  hourlyRate?: number;
  currency: string;
  platform?: {
    _id: string;
    name: string;
    chargePercentage?: number;
  } | string;
}
interface AddPaymentModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPaymentModal({ projectId, isOpen, onClose, onSuccess }: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [hourlyWorkOptions, setHourlyWorkOptions] = useState<HourlyWork[]>([]);
  const [formData, setFormData] = useState({
    amount: "",
    platformCharge: "",
    conversionRate: "",
    paymentDate: new Date().toISOString().split("T")[0],
    platformWallet: "",
    walletStatus: "on_hold",
    walletReceivedDate: "",
    bankAccount: "",
    bankStatus: "pending",
    bankTransferDate: "",
    notes: "",
    hoursBilled: "",
    hourlyWorkEntries: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset formData each time modal/project changes
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        amount: "",
        platformCharge: "",
        conversionRate: "",
        paymentDate: new Date().toISOString().split("T")[0],
        platformWallet: "",
        walletStatus: "on_hold",
        walletReceivedDate: "",
        bankAccount: "",
        bankStatus: "pending",
        bankTransferDate: "",
        notes: "",
        hoursBilled: "",
        hourlyWorkEntries: [],
      });
      setPlatformChargeManuallyEdited(false);
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchProject();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  useEffect(() => {
    if (project && project.priceType === "hourly") fetchHourlyWork();
    // eslint-disable-next-line
  }, [project]);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts();
      setAccounts(Array.isArray(data) ? data : (Array.isArray(data.accounts) ? data.accounts : []));
    } catch {
      setAccounts([]);
    }
  };
  const fetchProject = async () => {
    try {
      const data = await apiClient.getProject(projectId);
      setProject(data.project ? data.project : data);
    } catch {
      setProject(null);
    }
  };
  const fetchHourlyWork = async () => {
    try {
      const data = await apiClient.getHourlyWorkEntries(projectId);
      setHourlyWorkOptions(Array.isArray(data) ? data : []);
    } catch {
      setHourlyWorkOptions([]);
    }
  };

  // Track if user manually edited the platform charge field
  const [platformChargeManuallyEdited, setPlatformChargeManuallyEdited] = useState(false);

  // For hourly project: auto-fill Hours Billed & Amount
  useEffect(() => {
    if (project?.priceType === "hourly") {
      const selectedWorks = hourlyWorkOptions.filter(work =>
        formData.hourlyWorkEntries.includes(work._id)
      );
      const hours = selectedWorks.reduce((acc, w) => acc + w.hours, 0);
      const rate = Number(project.hourlyRate) || 0;
      const calculatedAmount = hours > 0 ? (hours * rate).toFixed(2) : "";
      setFormData(f => ({
        ...f,
        hoursBilled: hours > 0 ? hours.toString() : "",
        amount: calculatedAmount,
      }));
      
      // Also auto-calculate platform charge when amount is auto-set for hourly projects
      if (calculatedAmount && !platformChargeManuallyEdited) {
        const platform = typeof project?.platform === 'object' ? project.platform : null;
        const chargePercentage = platform?.chargePercentage;
        if (chargePercentage && chargePercentage > 0) {
          const calculatedCharge = (Number(calculatedAmount) * chargePercentage) / 100;
          setFormData(f => ({
            ...f,
            platformCharge: calculatedCharge.toFixed(2),
          }));
        }
      }
    }
    // eslint-disable-next-line
  }, [formData.hourlyWorkEntries, project?.hourlyRate, hourlyWorkOptions, project?.platform, platformChargeManuallyEdited]);

  // Auto-calculate platform charge when amount changes and platform has chargePercentage
  
  useEffect(() => {
    const amount = Number(formData.amount) || 0;
    const platform = typeof project?.platform === 'object' ? project.platform : null;
    const chargePercentage = platform?.chargePercentage;
    
    // Auto-calculate if:
    // 1. Amount is entered
    // 2. Platform has chargePercentage
    // 3. User hasn't manually edited the platform charge field
    if (amount > 0 && chargePercentage && chargePercentage > 0 && !platformChargeManuallyEdited) {
      const calculatedCharge = (amount * chargePercentage) / 100;
      setFormData(f => ({
        ...f,
        platformCharge: calculatedCharge.toFixed(2),
      }));
    }
    // eslint-disable-next-line
  }, [formData.amount, project?.platform, platformChargeManuallyEdited]);

  // Wallet/Bank status sync
  useEffect(() => {
    // When wallet status changes, enforce bank status
    if (formData.walletStatus === "on_hold") {
      setFormData(f => ({ ...f, bankStatus: "pending" }));
    } else if (formData.walletStatus === "released") {
      setFormData(f => ({ ...f, bankStatus: "received" }));
    }
    // eslint-disable-next-line
  }, [formData.walletStatus]);

  // Amount in INR: always calculated (never editable)
  const amount = Number(formData.amount) || 0;
  const platformCharge = Number(formData.platformCharge) || 0;
  const conversionRate = Number(formData.conversionRate) || 0;
  const amountInINR =
    amount - platformCharge > 0 && conversionRate > 0
      ? ((amount - platformCharge) * conversionRate).toFixed(2)
      : "0.00";

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Amount is required";
    if (!formData.platformCharge) newErrors.platformCharge = "Platform charge is required";
    if (!formData.conversionRate) newErrors.conversionRate = "Conversion rate is required";
    if (!formData.paymentDate) newErrors.paymentDate = "Payment date is required";
    if (!formData.platformWallet) newErrors.platformWallet = "Select wallet account";
    if (!formData.walletStatus) newErrors.walletStatus = "Wallet status is required";
    if (!formData.bankStatus) newErrors.bankStatus = "Bank status is required";
    if (project && project.priceType === "hourly") {
      if (!formData.hoursBilled || Number(formData.hoursBilled) <= 0) newErrors.hoursBilled = "Hours billed is required";
      if (!formData.hourlyWorkEntries.length) newErrors.hourlyWorkEntries = "Select at least one hourly work entry";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const payload: any = {
        project: projectId,
        amount: Number(formData.amount),
        platformCharge: Number(formData.platformCharge),
        conversionRate: Number(formData.conversionRate),
        amountInINR: Number(amountInINR),
        paymentDate: formData.paymentDate,
        platformWallet: formData.platformWallet,
        walletStatus: formData.walletStatus,
        walletReceivedDate: formData.walletReceivedDate || undefined,
        notes: formData.notes,
        bankStatus: formData.bankStatus,
        bankTransferDate: formData.bankTransferDate || undefined,
      };
      if (formData.bankAccount) payload.bankAccount = formData.bankAccount;
      if (project && project.priceType === "hourly") {
        payload.hoursBilled = Number(formData.hoursBilled);
        payload.hourlyWorkEntries = formData.hourlyWorkEntries;
      }
      await apiClient.createProjectPayment(payload);
      setFormData({
        amount: "",
        platformCharge: "",
        conversionRate: "",
        paymentDate: new Date().toISOString().split("T")[0],
        platformWallet: "",
        walletStatus: "on_hold",
        walletReceivedDate: "",
        bankAccount: "",
        bankStatus: "pending",
        bankTransferDate: "",
        notes: "",
        hoursBilled: "",
        hourlyWorkEntries: [],
      });
      setErrors({});
      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: "Failed to create payment. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, options } = e.target;
    if (type === "select-multiple") {
      const selected: string[] = [];
      for (let i = 0; i < options.length; i++) {
        if ((options[i] as any).selected) selected.push(options[i].value);
      }
      setFormData(f => ({ ...f, [name]: selected }));
    } else {
      setFormData(f => ({ ...f, [name]: value }));
      // Track if user manually edits platform charge
      if (name === "platformCharge") {
        setPlatformChargeManuallyEdited(true);
      }
    }
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  if (!isOpen) return null;
  if (!project) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <ModernCardHeader>
            <ModernCardTitle>Loading Project Details...</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModernCardHeader>
          <div className="flex justify-between items-center">
            <ModernCardTitle>Add Payment</ModernCardTitle>
            <ModernButton variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </ModernButton>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{errors.submit}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AMOUNT (editable for fixed, readonly for hourly) */}
              <ModernInput
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                label="Amount *"
                error={errors.amount}
                readOnly={project.priceType === "hourly"}
              />
              {/* PLATFORM CHARGE */}
              <ModernInput
                name="platformCharge"
                type="number"
                step="0.01"
                value={formData.platformCharge}
                onChange={handleChange}
                placeholder="e.g., 10"
                label="Platform Charge"
                error={errors.platformCharge}
              />
              {/* CONVERSION RATE */}
              <ModernInput
                name="conversionRate"
                type="number"
                step="0.01"
                value={formData.conversionRate}
                onChange={handleChange}
                placeholder="e.g., 83.5"
                label="Conversion Rate *"
                error={errors.conversionRate}
              />
              {/* AMOUNT IN INR (read-only) */}
              <div className="space-y-1">
                <ModernInput
                  name="amountInINR"
                  type="number"
                  value={amountInINR}
                  readOnly
                  label="Amount in INR"
                  className="bg-gray-50 cursor-not-allowed"
                />
                <span className="text-xs text-gray-500">Calculated as (Amount - Platform Charge) * Conversion Rate</span>
              </div>
              {/* PAYMENT DATE */}
              <ModernInput
                name="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={handleChange}
                label="Payment Date *"
                error={errors.paymentDate}
              />
              {/* WALLET */}
              <ModernSelect
                name="platformWallet"
                value={formData.platformWallet}
                onChange={handleChange}
                label="Wallet Account"
                error={errors.platformWallet}
                options={accounts.filter(acc => acc.type === "wallet").map(acc => ({
                  value: acc._id,
                  label: `${acc.name} (${acc.type})`
                }))}
              />
              {/* WALLET STATUS */}
              <ModernSelect
                name="walletStatus"
                value={formData.walletStatus}
                onChange={handleChange}
                label="Wallet Status"
                error={errors.walletStatus}
                options={[
                  { value: "on_hold", label: "On Hold" },
                  { value: "released", label: "Released" }
                ]}
              />
              {/* BANK */}
              <ModernSelect
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                label="Bank Account (Optional)"
                options={accounts.filter(acc => acc.type === "bank").map(acc => ({
                  value: acc._id,
                  label: `${acc.name} (${acc.type})`
                }))}
              />
              {/* BANK STATUS */}
              <ModernSelect
                name="bankStatus"
                value={formData.bankStatus}
                onChange={handleChange}
                label="Bank Status *"
                error={errors.bankStatus}
                disabled={formData.walletStatus === "on_hold"}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "received", label: "Received" }
                ]}
              />
              {/* HOURLY FIELDS */}
              {project && project.priceType === "hourly" && (
                <>
                  <ModernInput
                    name="hoursBilled"
                    type="number"
                    step="0.1"
                    value={formData.hoursBilled}
                    readOnly
                    label="Hours Billed *"
                    error={errors.hoursBilled}
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Hourly Work Entries *</label>
                    <select
                      name="hourlyWorkEntries"
                      multiple
                      value={formData.hourlyWorkEntries}
                      onChange={handleChange}
                      className={cn(
                        "flex min-h-[12rem] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200",
                        "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
                        errors.hourlyWorkEntries && "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      )}
                    >
                      {hourlyWorkOptions
                        .filter(e => !e.billed)
                        .map(entry => (
                          <option key={entry._id} value={entry._id}>
                            {entry.weekStart} - {entry.hours} hrs
                          </option>
                        ))}
                    </select>
                    {errors.hourlyWorkEntries && <p className="text-xs text-red-500 mt-1">{errors.hourlyWorkEntries}</p>}
                  </div>
                </>
              )}
            </div>
            <ModernInput
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this payment"
              label="Notes (Optional)"
            />
            <div className="flex gap-4 pt-4">
              <ModernButton type="submit" disabled={loading} className="flex-1" loading={loading}>
                {loading ? "Adding Payment..." : "Add Payment"}
              </ModernButton>
              <ModernButton type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </ModernButton>
            </div>
          </form>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}
