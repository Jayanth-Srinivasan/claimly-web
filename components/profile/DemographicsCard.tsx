'use client'

import { User, Phone, MapPin, Briefcase } from 'lucide-react'
import type { Profile } from '@/types/auth'

interface DemographicsCardProps {
  profile: Profile
}

export function DemographicsCard({ profile }: DemographicsCardProps) {
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Personal Information</h2>
        <button className="text-sm text-primary hover:underline">Edit</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Full Name</label>
            <div className="flex items-center gap-2 mt-1">
              <User className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="font-medium">{profile.full_name}</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-medium">{profile.email}</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Date of Birth</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-medium">
                {profile.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString()
                  : 'Not provided'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Gender</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-medium capitalize">
                {profile.gender?.replace(/-/g, ' ') || 'Not provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Phone Number</label>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="font-medium">{profile.phone_number || 'Not provided'}</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-black/60 dark:text-white/60">Address</label>
            <div className="flex items-start gap-2 mt-1">
              <MapPin className="w-4 h-4 text-black/40 dark:text-white/40 mt-0.5" />
              <div className="font-medium">
                {profile.address_line1 ? (
                  <>
                    <div>{profile.address_line1}</div>
                    {profile.address_line2 && <div>{profile.address_line2}</div>}
                    <div>
                      {profile.city}, {profile.state} {profile.zip_code}
                    </div>
                    <div>{profile.country}</div>
                  </>
                ) : (
                  'Not provided'
                )}
              </div>
            </div>
          </div>

          {profile.occupation && (
            <div>
              <label className="text-sm text-black/60 dark:text-white/60">Occupation</label>
              <div className="flex items-center gap-2 mt-1">
                <Briefcase className="w-4 h-4 text-black/40 dark:text-white/40" />
                <span className="font-medium">{profile.occupation}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
