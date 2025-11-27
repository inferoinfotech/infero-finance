// types/lead.ts
export type Address = {
  streetAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export type FollowUp = {
  _id?: string
  date: string
  clientResponse?: string
  notes?: string
  nextFollowUpDate?: string
  addedBy?: { _id: string; name: string; email: string } | string
}

export type Lead = {
  _id: string
  leadBy: { _id: string; name: string; email: string } | string
  assignedTo?: { _id: string; name: string; email: string } | string
  clientName: string
  companyName?: string
  clientEmail?: string
  clientMobile?: string
  projectDetails?: string
  platform?: { _id: string; name: string } | string
  priority: "High" | "Medium" | "Low"
  estimatedBudget: number
  stage: "New" | "Contacted" | "In Discussion" | "Proposal Sent" | "Negotiation" | "Won" | "Lost" | "On Hold" | "No Reply"
  address?: Address
  tags?: string[]
  dateCreated?: string
  nextFollowUpDate?: string
  followUps?: FollowUp[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}
