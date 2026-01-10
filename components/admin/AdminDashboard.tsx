'use client'

import { useRouter } from 'next/navigation'
import { Shield, Clock, CheckCircle, XCircle, FileText, Settings } from 'lucide-react'
import { TopBar } from './TopBar'
import { StatCard } from './StatCard'
import { ActionCard } from './ActionCard'
import { ClaimCard } from './ClaimCard'
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

// Mock data
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
      {
        id: 'd1',
        name: 'boarding-pass.pdf',
        type: 'application/pdf',
        url: '/mock/boarding-pass.pdf',
        uploadedAt: new Date('2024-01-15'),
      },
      {
        id: 'd2',
        name: 'hotel-receipt.jpg',
        type: 'image/jpeg',
        url: '/mock/hotel-receipt.jpg',
        uploadedAt: new Date('2024-01-15'),
      },
    ],
    messages: [
      {
        id: 'm1',
        role: 'customer',
        content: 'My flight was delayed by 6 hours due to mechanical problems. I had to book a hotel for the night and buy meals. I have all the receipts attached.',
        timestamp: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'm2',
        role: 'ai',
        content: 'Based on the claim details, this appears to be a valid travel delay claim. The policy covers delays over 4 hours with accommodation and meal expenses up to $2000. Recommend approval.',
        timestamp: new Date('2024-01-15T10:30:00'),
      },
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
      {
        id: 'd3',
        name: 'baggage-claim.pdf',
        type: 'application/pdf',
        url: '/mock/baggage-claim.pdf',
        uploadedAt: new Date('2024-01-10'),
      },
    ],
    messages: [
      {
        id: 'm3',
        role: 'customer',
        content: 'My checked baggage was lost during my flight from New York to London. The airline has confirmed it is missing. I had valuable electronics and clothing inside.',
        timestamp: new Date('2024-01-10T14:00:00'),
      },
      {
        id: 'm4',
        role: 'admin',
        content: 'Thank you for submitting your claim. I have reviewed your documentation and approved your claim for $800. You should receive payment within 5-7 business days.',
        timestamp: new Date('2024-01-11T09:00:00'),
      },
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
      {
        id: 'd4',
        name: 'hospital-bill.pdf',
        type: 'application/pdf',
        url: '/mock/hospital-bill.pdf',
        uploadedAt: new Date('2024-01-12'),
      },
      {
        id: 'd5',
        name: 'prescription.jpg',
        type: 'image/jpeg',
        url: '/mock/prescription.jpg',
        uploadedAt: new Date('2024-01-12'),
      },
      {
        id: 'd6',
        name: 'doctors-note.pdf',
        type: 'application/pdf',
        url: '/mock/doctors-note.pdf',
        uploadedAt: new Date('2024-01-12'),
      },
    ],
    messages: [
      {
        id: 'm5',
        role: 'customer',
        content: 'I was hospitalized in Thailand for severe food poisoning. I have attached all medical bills and prescriptions.',
        timestamp: new Date('2024-01-12T16:00:00'),
      },
      {
        id: 'm6',
        role: 'admin',
        content: 'Thank you for your submission. We are currently reviewing your medical documents. We may need additional information from the hospital.',
        timestamp: new Date('2024-01-13T10:00:00'),
      },
      {
        id: 'm7',
        role: 'ai',
        content: 'Medical claim review: Emergency treatment is covered under the policy. Recommend requesting itemized bill and verification of treatment necessity.',
        timestamp: new Date('2024-01-13T10:15:00'),
      },
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
      {
        id: 'd7',
        name: 'original-ticket.pdf',
        type: 'application/pdf',
        url: '/mock/original-ticket.pdf',
        uploadedAt: new Date('2024-01-08'),
      },
    ],
    messages: [
      {
        id: 'm8',
        role: 'customer',
        content: 'I missed my connecting flight because of heavy traffic on the way to the airport. Can I get reimbursed for the new ticket I had to buy?',
        timestamp: new Date('2024-01-08T11:00:00'),
      },
      {
        id: 'm9',
        role: 'admin',
        content: 'Unfortunately, our policy does not cover missed flights due to traffic or other personal delays. The policy only covers airline-caused delays. Your claim has been rejected.',
        timestamp: new Date('2024-01-09T09:00:00'),
      },
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
      {
        id: 'd8',
        name: 'hotel-booking.pdf',
        type: 'application/pdf',
        url: '/mock/hotel-booking.pdf',
        uploadedAt: new Date('2024-01-14'),
      },
      {
        id: 'd9',
        name: 'flight-confirmation.pdf',
        type: 'application/pdf',
        url: '/mock/flight-confirmation.pdf',
        uploadedAt: new Date('2024-01-14'),
      },
    ],
    messages: [
      {
        id: 'm10',
        role: 'customer',
        content: 'I had to cancel my trip due to a family emergency (my father was hospitalized). I lost money on non-refundable bookings. I have attached all documentation.',
        timestamp: new Date('2024-01-14T08:00:00'),
      },
    ],
  },
]

interface AdminDashboardProps {
  profile: Profile
}

export function AdminDashboard({ profile }: AdminDashboardProps) {
  const router = useRouter()
  // Using mockClaims directly since claims are not yet editable
  // TODO: Implement claim update functionality using setClaims when backend is ready
  const claims = mockClaims

  // Calculate stats with null safety
  const stats = {
    total: (claims || []).length,
    pending: (claims || []).filter((c) => c.status === 'pending').length,
    approved: (claims || []).filter((c) => c.status === 'approved').length,
    rejected: (claims || []).filter((c) => c.status === 'rejected').length,
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Claims" value={stats.total} icon={Shield} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} trend={{ value: 12, positive: true }} />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle} trend={{ value: 8, positive: true }} />
            <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              title="Manage Policies"
              description="Add, edit, or remove insurance policies and coverage options"
              icon={FileText}
              onClick={() => router.push('/admin/policies')}
            />
            <ActionCard
              title="Coverage Types & Rules"
              description="Manage coverage types, questions, and validation rules"
              icon={Settings}
              onClick={() => router.push('/admin/coverage-types')}
            />
          </div>

          {/* Claims List */}
          <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black dark:text-white">
                  All Claims ({claims.length})
                </h2>
              </div>

              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
                  <p className="text-black/60 dark:text-white/60">No claims yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim) => (
                    <ClaimCard
                      key={claim.id}
                      claim={claim}
                      isActive={false}
                      onClick={() => router.push(`/admin/claims/${claim.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
