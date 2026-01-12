'use client'

import { ProfileTopBar } from './ProfileTopBar'
import { DemographicsCard } from './DemographicsCard'
import { PoliciesCard } from './PoliciesCard'
import type { Profile } from '@/types/auth'
import type { UserPolicyWithPolicy } from '@/types/user-policies'

interface ProfilePageProps {
  profile: Profile
  userPolicies: UserPolicyWithPolicy[]
}

export function ProfilePage({ profile, userPolicies }: ProfilePageProps) {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <ProfileTopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your personal information and insurance policies
            </p>
          </div>

          {/* Demographics Card */}
          <DemographicsCard profile={profile} />

          {/* Policies Card */}
          <PoliciesCard userPolicies={userPolicies} />
        </div>
      </div>
    </div>
  )
}
