"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ModernButton } from "@/components/ui/modern-button";
import { ModernInput } from "@/components/ui/modern-input";
import { ModernSelect } from "@/components/ui/modern-select";
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card";
import { apiClient } from "@/lib/api";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { X } from "lucide-react";

interface Account {
  _id: string;
  name: string;
  type: "bank" | "wallet";
}
interface HourlyWork {
  _id: string;
  weekStart?: string;
  hours: number;
  user?: { name?: string };
  note?: string;
  billed?: boolean;
  payment?: string;
}
interface Project {
  _id: string;
  priceType: "fixed" | "hourly";
  hourlyRate?: number;
}
interface Payment {
  _id: string;
  amount: number;
  currency: string;
  amountInINR: number;
  paymentDate: string;
  platformWallet: string | Account;
  walletStatus: string;
  bankAccount?: string | Account;
  bankStatus: string;
  notes?: string;
  project: string;
  hoursBilled?: number;
  hourlyWorkEntries?: string[] | HourlyWork[];
  conversionRate?: number;
  platformCharge?: number;
}
interface EditPaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPaymentModal({ payment, isOpen, onClose, onSuccess }: EditPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [hourlyWorkOptions, setHourlyWorkOptions] = useState<HourlyWork[]>([]);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "USD",
    amountInINR: "",
    paymentDate: "",
    platformWallet: "",
    walletStatus: "on_hold",
    bankAccount: "",
    bankStatus: "pending",
    notes: "",
    hoursBilled: "",
    hourlyWorkEntries: [] as string[],
    conversionRate: "",
    platformCharge: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load payment/project/accounts when modal opens
  useEffect(() => {
    if (isOpen && payment) {
      fetchAccounts();
      fetchProject(payment);
      setFormData({
        amount: payment.amount?.toString() || "",
        currency: payment.currency || "USD",
        amountInINR: payment.amountInINR?.toString() || "",
        paymentDate: payment.paymentDate ? payment.paymentDate.split("T")[0] : "",
        platformWallet: typeof payment.platformWallet === "object" ? payment.platformWallet._id : payment.platformWallet || "",
        walletStatus: payment.walletStatus === "released" ? "released" : "on_hold",
        bankAccount: payment.bankAccount
          ? typeof payment.bankAccount === "object"
            ? payment.bankAccount._id
            : payment.bankAccount
          : "",
        bankStatus: payment.walletStatus === "released" ? "received" : "pending",
        notes: payment.notes || "",
        hoursBilled: payment.hoursBilled?.toString() || "",
        hourlyWorkEntries: (payment.hourlyWorkEntries && Array.isArray(payment.hourlyWorkEntries))
          ? payment.hourlyWorkEntries.map((e: any) => (typeof e === "string" ? e : e._id))
          : [],
        conversionRate: payment.conversionRate?.toString?.() || "",
        platformCharge: payment.platformCharge?.toString?.() || "",
      });
    }
    // eslint-disable-next-line
  }, [isOpen, payment]);

  useEffect(() => {
    if (project && project.priceType === "hourly" && payment) {
      fetchHourlyWork(payment);
    }
    // eslint-disable-next-line
  }, [project, payment]);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.getAccounts();
      const accArray = Array.isArray(data) ? data : (Array.isArray(data.accounts) ? data.accounts : []);
      setAccounts(accArray);
    } catch (error) {
      setAccounts([]);
    }
  };

  const fetchProject = async (payment: Payment) => {
    try {
      const paymentProjectId = (payment.project || (payment as any)._id?.split("-")[0]);
      const proj = await apiClient.getProject(paymentProjectId);
      setProject(proj.project ? proj.project : proj);
    } catch (error) {
      setProject(null);
    }
  };

  // For hourly: get all unbilled OR already billed to this payment
  const fetchHourlyWork = async (payment: Payment) => {
    try {
      const paymentProjectId = (payment.project || (payment as any)._id?.split("-")[0]);
      let logs = await apiClient.getHourlyWorkEntries(paymentProjectId);
      logs = Array.isArray(logs) ? logs : [];
      // Always show unbilled + logs already billed by this payment (for editing)
      const currentIds = new Set(
        (payment.hourlyWorkEntries || []).map((e: any) => (typeof e === "string" ? e : e._id))
      );
      const selectableLogs = logs.filter(
        (log: HourlyWork) => !log.billed || (log.payment && currentIds.has(log._id))
      );
      setHourlyWorkOptions(selectableLogs);
    } catch (error) {
      setHourlyWorkOptions([]);
    }
  };

  // Auto-calc for hourly payment
  useEffect(() => {
    if (project?.priceType === "hourly") {
      // Get selected HourlyWork objects
      const selectedLogs = hourlyWorkOptions.filter(work =>
        formData.hourlyWorkEntries.includes(work._id)
      );
      const hours = selectedLogs.reduce((acc, w) => acc + w.hours, 0);
      const rate = Number(project.hourlyRate) || 0;
      setFormData(f => ({
        ...f,
        hoursBilled: hours > 0 ? hours.toString() : "",
        amount: hours > 0 ? (hours * rate).toFixed(2) : "",
      }));
    }
    // eslint-disable-next-line
  }, [formData.hourlyWorkEntries, project?.hourlyRate, hourlyWorkOptions]);

  // --- Wallet/Bank Status Logic ---
  useEffect(() => {
    if (formData.walletStatus === "on_hold") {
      setFormData(f => ({ ...f, bankStatus: "pending" }));
    } else if (formData.walletStatus === "released") {
      setFormData(f => ({ ...f, bankStatus: "received" }));
    }
    // eslint-disable-next-line
  }, [formData.walletStatus]);
  // ---

  // Amount in INR: always calculated (never editable)
  const amount = Number(formData.amount) || 0;
  const platformCharge = Number(formData.platformCharge) || 0;
  const conversionRate = Number(formData.conversionRate) || 0;
  const amountInINR =
    amount - platformCharge > 0 && conversionRate > 0
      ? ((amount - platformCharge) * conversionRate).toFixed(2)
      : "0.00";

  // Auto-update amountInINR on field changes
  useEffect(() => {
    setFormData(f => ({
      ...f,
      amountInINR,
    }));
    // eslint-disable-next-line
  }, [formData.amount, formData.platformCharge, formData.conversionRate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Amount is required and must be greater than 0";
    if (!formData.amountInINR || Number(formData.amountInINR) <= 0) newErrors.amountInINR = "Amount in INR is required and must be greater than 0";
    if (!formData.paymentDate) newErrors.paymentDate = "Payment date is required";
    if (!formData.platformWallet) newErrors.platformWallet = "Select wallet account";
    if (!formData.walletStatus) newErrors.walletStatus = "Wallet status is required";
    if (!formData.bankStatus) newErrors.bankStatus = "Bank status is required";
    if (!formData.conversionRate) newErrors.conversionRate = "Conversion rate is required";
    if (!formData.platformCharge) newErrors.platformCharge = "Platform charge is required";
    // Hourly specific
    if (project && project.priceType === "hourly") {
      if (!formData.hoursBilled || Number(formData.hoursBilled) <= 0) newErrors.hoursBilled = "Hours billed is required";
      if (!formData.hourlyWorkEntries.length) newErrors.hourlyWorkEntries = "Select at least one hourly work entry";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !payment) return;
    setLoading(true);
    try {
      const updateData: any = {
        amount: Number(formData.amount),
        amountInINR: Number(formData.amountInINR),
        paymentDate: formData.paymentDate,
        platformWallet: formData.platformWallet,
        walletStatus: formData.walletStatus,
        bankStatus: formData.bankStatus,
        notes: formData.notes,
        conversionRate: Number(formData.conversionRate),
        platformCharge: Number(formData.platformCharge),
      };
      if (formData.currency) updateData.currency = formData.currency;
      if (formData.bankAccount) updateData.bankAccount = formData.bankAccount;
      // Hourly fields
      if (project && project.priceType === "hourly") {
        updateData.hoursBilled = Number(formData.hoursBilled);
        updateData.hourlyWorkEntries = formData.hourlyWorkEntries;
      }
      await apiClient.updateProjectPayment(payment._id, updateData);
      setErrors({});
      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: "Failed to update payment. Please try again." });
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
    }
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  if (!isOpen || !payment) return null;

  const modalContent = !project ? (
    <div 
      data-modal-backdrop
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
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
    </div>
  ) : (
    <div 
      data-modal-backdrop
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <ModernCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <ModernCardHeader>
          <div className="flex justify-between items-center">
            <ModernCardTitle className="text-2xl">Edit Payment</ModernCardTitle>
            <ModernButton variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </ModernButton>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{errors.submit}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AMOUNT (readonly for hourly) */}
              <ModernInput
                label="Amount *"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                error={errors.amount}
                readOnly={project.priceType === "hourly"}
              />
              {/* CURRENCY */}
              <ModernSelect
                label="Currency *"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                error={errors.currency}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "GBP", label: "GBP" },
                  { value: "INR", label: "INR" }
                ]}
              />
              {/* PLATFORM CHARGE */}
              <ModernInput
                label="Platform Charge *"
                name="platformCharge"
                type="number"
                step="0.01"
                value={formData.platformCharge}
                onChange={handleChange}
                placeholder="e.g., 10"
                error={errors.platformCharge}
              />
              {/* CONVERSION RATE */}
              <ModernInput
                label="Conversion Rate *"
                name="conversionRate"
                type="number"
                step="0.01"
                value={formData.conversionRate}
                onChange={handleChange}
                placeholder="e.g., 83.5"
                error={errors.conversionRate}
              />
              {/* INR AMOUNT */}
              <ModernInput
                label="Amount in INR *"
                name="amountInINR"
                type="number"
                step="0.01"
                value={formData.amountInINR}
                readOnly
                error={errors.amountInINR}
              />
              {/* PAYMENT DATE */}
              <ModernInput
                label="Payment Date *"
                name="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={handleChange}
                error={errors.paymentDate}
              />
              {/* WALLET */}
              <ModernSelect
                label="Wallet Account *"
                name="platformWallet"
                value={formData.platformWallet}
                onChange={handleChange}
                error={errors.platformWallet}
                required
                options={[
                  { value: "", label: "Select Wallet Account" },
                  ...accounts.filter(acc => acc.type === "wallet").map(acc => ({
                    value: acc._id,
                    label: `${acc.name} (${acc.type})`
                  }))
                ]}
              />
              {/* WALLET STATUS */}
              <ModernSelect
                label="Wallet Status *"
                name="walletStatus"
                value={formData.walletStatus}
                onChange={handleChange}
                error={errors.walletStatus}
                options={[
                  { value: "on_hold", label: "On Hold" },
                  { value: "released", label: "Released" }
                ]}
              />
              {/* BANK */}
              <ModernSelect
                label="Bank Account"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                options={[
                  { value: "", label: "Select Bank Account (Optional)" },
                  ...accounts.filter(acc => acc.type === "bank").map(acc => ({
                    value: acc._id,
                    label: `${acc.name} (${acc.type})`
                  }))
                ]}
              />
              {/* BANK STATUS */}
              <ModernInput
                label="Bank Status *"
                name="bankStatus"
                value={
                  formData.walletStatus === "released"
                    ? "received"
                    : "pending"
                }
                readOnly
                error={errors.bankStatus}
              />
              {/* HOURLY FIELDS */}
              {project && project.priceType === "hourly" && (
                <>
                  <ModernInput
                    label="Hours Billed *"
                    name="hoursBilled"
                    type="number"
                    step="0.1"
                    value={formData.hoursBilled}
                    readOnly
                    error={errors.hoursBilled}
                  />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Work Entries * <span className="text-gray-500 text-xs">(Hold Ctrl/Cmd to select multiple)</span>
                    </label>
                    <select
                      name="hourlyWorkEntries"
                      multiple
                      value={formData.hourlyWorkEntries}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.hourlyWorkEntries 
                          ? "border-red-300 focus:ring-red-500" 
                          : "border-gray-300 focus:border-blue-500"
                      } bg-white min-h-[120px]`}
                    >
                      {hourlyWorkOptions.map(entry => (
                        <option key={entry._id} value={entry._id}>
                          {formatDateDDMMYYYY(entry.weekStart, "")}
                          {" - "}
                          {entry.hours} hrs
                          {entry.user?.name ? ` (${entry.user.name})` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.hourlyWorkEntries && (
                      <p className="text-sm text-red-600 mt-1">{errors.hourlyWorkEntries}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <ModernInput
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this payment"
            />
            <div className="flex gap-4 pt-4">
              <ModernButton type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating Payment..." : "Update Payment"}
              </ModernButton>
              <ModernButton type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </ModernButton>
            </div>
          </form>
        </ModernCardContent>
      </ModernCard>
      </div>
    </div>
  );

  // Use Portal to render outside normal DOM hierarchy
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
