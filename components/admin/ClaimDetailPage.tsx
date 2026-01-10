'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Eye,
  Download
} from 'lucide-react'
import { ClaimChat } from './ClaimChat'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/auth'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
}

interface ClaimDocument {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: Date
}

interface Claim {
  id: string
  claimNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  type: 'travel' | 'medical' | 'baggage' | 'flight'
  status: 'pending' | 'approved' | 'rejected' | 'under-review'
  amount: number
  currency: string
  submittedAt: Date
  description: string
  documents: ClaimDocument[]
  messages: ClaimMessage[]
}

// Mock data (same as AdminDashboard)
const mockClaims: Claim[] = [
  {
    id: '1',
    claimNumber: 'CLM-2024-001',
    customerId: 'user-123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    type: 'travel',
    status: 'pending',
    amount: 1500,
    currency: 'USD',
    submittedAt: new Date('2024-01-15'),
    description: 'Flight was delayed by 6 hours due to mechanical issues. Requesting compensation for meals and accommodation as per policy terms.',
    documents: [
      { id: 'd1', name: 'boarding-pass.pdf', type: 'application/pdf', url: '/mock/boarding-pass.pdf', uploadedAt: new Date('2024-01-15') },
      { id: 'd2', name: 'hotel-receipt.jpg', type: 'image/jpeg', url: '/mock/hotel-receipt.jpg', uploadedAt: new Date('2024-01-15') },
    ],
    messages: [
      { id: 'm1', role: 'customer', content: 'My flight was delayed by 6 hours due to mechanical problems. I had to book a hotel for the night and buy meals. I have all the receipts attached.', timestamp: new Date('2024-01-15T10:00:00') },
      { id: 'm2', role: 'ai', content: 'Based on the claim details, this appears to be a valid travel delay claim. The policy covers delays over 4 hours with accommodation and meal expenses up to $2000. Recommend approval.', timestamp: new Date('2024-01-15T10:30:00') },
    ],
  },
  {
    id: '2',
    claimNumber: 'CLM-2024-002',
    customerId: 'user-456',
    customerName: 'Sarah Smith',
    customerEmail: 'sarah@example.com',
    type: 'baggage',
    status: 'approved',
    amount: 800,
    currency: 'USD',
    submittedAt: new Date('2024-01-10'),
    description: 'Checked baggage was lost during international flight. Contains personal items and electronics valued at $800.',
    documents: [
      { id: 'd3', name: 'baggage-claim.pdf', type: 'application/pdf', url: '/mock/baggage-claim.pdf', uploadedAt: new Date('2024-01-10') },
    ],
    messages: [
      { id: 'm3', role: 'customer', content: 'My checked baggage was lost during my flight from New York to London. The airline has confirmed it is missing. I had valuable electronics and clothing inside.', timestamp: new Date('2024-01-10T14:00:00') },
      { id: 'm4', role: 'admin', content: 'Thank you for submitting your claim. I have reviewed your documentation and approved your claim for $800. You should receive payment within 5-7 business days.', timestamp: new Date('2024-01-11T09:00:00') },
    ],
  },
  {
    id: '3',
    claimNumber: 'CLM-2024-003',
    customerId: 'user-789',
    customerName: 'Michael Johnson',
    customerEmail: 'michael@example.com',
    type: 'medical',
    status: 'under-review',
    amount: 3500,
    currency: 'USD',
    submittedAt: new Date('2024-01-12'),
    description: 'Required emergency medical treatment while traveling abroad. Hospitalized for 2 days with food poisoning.',
    documents: [
      { id: 'd4', name: 'hospital-bill.pdf', type: 'application/pdf', url: '/mock/hospital-bill.pdf', uploadedAt: new Date('2024-01-12') },
      { id: 'd5', name: 'prescription.jpg', type: 'image/jpeg', url: '/mock/prescription.jpg', uploadedAt: new Date('2024-01-12') },
      { id: 'd6', name: 'doctors-note.pdf', type: 'application/pdf', url: '/mock/doctors-note.pdf', uploadedAt: new Date('2024-01-12') },
    ],
    messages: [
      { id: 'm5', role: 'customer', content: 'I was hospitalized in Thailand for severe food poisoning. I have attached all medical bills and prescriptions.', timestamp: new Date('2024-01-12T16:00:00') },
      { id: 'm6', role: 'admin', content: 'Thank you for your submission. We are currently reviewing your medical documents. We may need additional information from the hospital.', timestamp: new Date('2024-01-13T10:00:00') },
      { id: 'm7', role: 'ai', content: 'Medical claim review: Emergency treatment is covered under the policy. Recommend requesting itemized bill and verification of treatment necessity.', timestamp: new Date('2024-01-13T10:15:00') },
    ],
  },
  {
    id: '4',
    claimNumber: 'CLM-2024-004',
    customerId: 'user-101',
    customerName: 'Emily Davis',
    customerEmail: 'emily@example.com',
    type: 'flight',
    status: 'rejected',
    amount: 500,
    currency: 'USD',
    submittedAt: new Date('2024-01-08'),
    description: 'Missed connecting flight due to traffic. Requesting reimbursement for rebooking.',
    documents: [
      { id: 'd7', name: 'original-ticket.pdf', type: 'application/pdf', url: '/mock/original-ticket.pdf', uploadedAt: new Date('2024-01-08') },
    ],
    messages: [
      { id: 'm8', role: 'customer', content: 'I missed my connecting flight because of heavy traffic on the way to the airport. Can I get reimbursed for the new ticket I had to buy?', timestamp: new Date('2024-01-08T11:00:00') },
      { id: 'm9', role: 'admin', content: 'Unfortunately, our policy does not cover missed flights due to traffic or other personal delays. The policy only covers airline-caused delays. Your claim has been rejected.', timestamp: new Date('2024-01-09T09:00:00') },
    ],
  },
  {
    id: '5',
    claimNumber: 'CLM-2024-005',
    customerId: 'user-202',
    customerName: 'David Wilson',
    customerEmail: 'david@example.com',
    type: 'travel',
    status: 'pending',
    amount: 2200,
    currency: 'USD',
    submittedAt: new Date('2024-01-14'),
    description: 'Trip cancellation due to family emergency. Requesting refund for non-refundable hotel and flight bookings.',
    documents: [
      { id: 'd8', name: 'hotel-booking.pdf', type: 'application/pdf', url: '/mock/hotel-booking.pdf', uploadedAt: new Date('2024-01-14') },
      { id: 'd9', name: 'flight-confirmation.pdf', type: 'application/pdf', url: '/mock/flight-confirmation.pdf', uploadedAt: new Date('2024-01-14') },
    ],
    messages: [
      { id: 'm10', role: 'customer', content: 'I had to cancel my trip due to a family emergency (my father was hospitalized). I lost money on non-refundable bookings. I have attached all documentation.', timestamp: new Date('2024-01-14T08:00:00') },
    ],
  },
]

const statusConfig = {
  pending: {
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    label: 'Pending',
  },
  approved: {
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    label: 'Rejected',
  },
  'under-review': {
    icon: AlertCircle,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    label: 'Under Review',
  },
}

interface ClaimDetailPageProps {
  claimId: string
  profile: Profile
}

export function ClaimDetailPage({ claimId, profile: _profile }: ClaimDetailPageProps) {
  const router = useRouter()
  const [claim, setClaim] = useState<Claim | undefined>(() => {
    console.log('Looking for claim with ID:', claimId)
    console.log('Available claim IDs:', mockClaims.map(c => c.id))
    const foundClaim = mockClaims.find((c) => c.id === claimId)
    console.log('Found claim:', foundClaim)
    return foundClaim
  })
  const [chatMode, setChatMode] = useState<'claimant' | 'ai'>('claimant')

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-black">
        <p className="text-xl font-semibold text-black dark:text-white mb-4">Claim not found</p>
        <Button onClick={() => router.push('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const status = statusConfig[claim.status]
  const StatusIcon = status.icon

  const handleSendMessage = (content: string, _files: File[]) => {
    if (!claim) return

    const newMessage: ClaimMessage = {
      id: `m${Date.now()}`,
      role: 'admin',
      content,
      timestamp: new Date(),
    }

    setClaim({ ...claim, messages: [...claim.messages, newMessage] })
  }

  const handleUpdateStatus = (newStatus: Claim['status']) => {
    if (!claim) return
    setClaim({ ...claim, status: newStatus })
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="px-6 py-4">
          {/* Top Row: Back button, Claim info, Status, Actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/admin')}
                className="shrink-0 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {claim.claimNumber}
                  </h1>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                      status.className
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60 mt-0.5">
                  {claim.customerName} • {claim.customerEmail}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {claim.status === 'pending' && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus('rejected')}
                  className="text-red-600 border-red-600/20 hover:bg-red-600/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('approved')}
                  className="bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              </div>
            )}
          </div>

          {/* Mode Switch */}
          <div className="flex items-center gap-3 pb-1">
            <MessageCircle className="h-4 w-4 text-black/40 dark:text-white/40" />
            <div className="inline-flex items-center gap-1 bg-black/4 dark:bg-white/4 rounded-lg p-1 border border-black/5 dark:border-white/5">
              <button
                onClick={() => setChatMode('claimant')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  chatMode === 'claimant'
                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                Chat with Claimant
              </button>
              <button
                onClick={() => setChatMode('ai')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  chatMode === 'ai'
                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                Chat with AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar: Claim Summary */}
        <div className="w-80 xl:w-96 border-r border-black/10 dark:border-white/10 bg-linear-to-b from-black/1 to-transparent dark:from-white/1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Claim Amount */}
            <div className="rounded-xl bg-linear-to-br from-black/3 to-black/1 dark:from-white/3 dark:to-white/1 border border-black/5 dark:border-white/5 p-6">
              <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60 mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Claim Amount</span>
              </div>
              <p className="text-3xl font-bold text-black dark:text-white">
                {claim.currency} {claim.amount.toLocaleString()}
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Type</p>
                  <p className="text-sm font-medium text-black dark:text-white capitalize mt-0.5">
                    {claim.type}
                  </p>
                </div>
                <div className="h-8 w-px bg-black/10 dark:bg-white/10" />
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Submitted</p>
                  <p className="text-sm font-medium text-black dark:text-white mt-0.5">
                    {claim.submittedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                Claim Description
              </h3>
              <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed">
                {claim.description}
              </p>
            </div>

            {/* Documents */}
            {claim.documents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                  Submitted Documents ({claim.documents.length})
                </h3>
                <div className="space-y-2">
                  {claim.documents.map((doc) => {
                    const isImage = doc.type.startsWith('image/')
                    return (
                      <div
                        key={doc.id}
                        className="group rounded-lg border border-black/10 dark:border-white/10 p-3 hover:bg-black/2 dark:hover:bg-white/2 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                            {isImage ? (
                              <ImageIcon className="h-5 w-5 text-black/60 dark:text-white/60" />
                            ) : (
                              <FileText className="h-5 w-5 text-black/60 dark:text-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-black/40 dark:text-white/40">
                              {doc.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                              <Eye className="h-4 w-4 text-black/60 dark:text-white/60" />
                            </button>
                            <button className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                              <Download className="h-4 w-4 text-black/60 dark:text-white/60" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
          <ClaimChat messages={claim.messages} mode={chatMode} onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
