"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { formatDateDDMMYYYY } from "@/lib/utils"
import { Edit, Trash2, DollarSign, Clock } from "lucide-react"
import { EditPaymentModal } from "./edit-payment-modal"

interface Payment {
  _id: string
  amount: number
  currency: string
  amountInINR: number
  paymentDate: string
  walletStatus: string
  bankStatus: string
  notes: string
  account?: {
    _id: string
    name: string
    type: string
  }
}

interface PaymentListProps {
  payments: Payment[]
  onPaymentUpdate: () => void
}

export function PaymentList({ payments, onPaymentUpdate }: PaymentListProps) {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setShowEditModal(true)
  }

  const handleDelete = async (paymentId: string) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      try {
        await apiClient.deleteProjectPayment(paymentId)
        onPaymentUpdate()
      } catch (error) {
        console.error("Failed to delete payment:", error)
      }
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleEditSuccess = () => {
    onPaymentUpdate()
    setShowEditModal(false)
    setEditingPayment(null)
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No payments recorded yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {payments.map((payment) => (
          <div key={payment._id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {payment.currency} {payment.amount.toLocaleString()} (₹{payment.amountInINR.toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateDDMMYYYY(payment.paymentDate)}</span>
                </div>
                {payment.account && (
                  <div className="text-sm text-gray-600">
                    <span>
                      Account: {payment.account.name} ({payment.account.type})
                    </span>
                  </div>
                )}
                {payment.notes && <p className="text-sm text-gray-600">{payment.notes}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Badge className={getPaymentStatusColor(payment.walletStatus)}>Wallet: {payment.walletStatus}</Badge>
                  <Badge className={getPaymentStatusColor(payment.bankStatus)}>Bank: {payment.bankStatus}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(payment)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(payment._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditPaymentModal
        payment={editingPayment}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingPayment(null)
        }}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
