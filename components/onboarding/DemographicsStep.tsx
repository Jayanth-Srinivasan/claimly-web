'use client'

import type { Profile } from '@/types/auth'

interface DemographicsStepProps {
  profile: Profile
  onComplete: (formData: FormData) => void
  isLoading: boolean
}

export function DemographicsStep({ profile, onComplete, isLoading }: DemographicsStepProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onComplete(formData)
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-8">
      <h2 className="text-2xl font-bold mb-6">Personal Information</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth *</label>
            <input
              type="date"
              name="date_of_birth"
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gender *</label>
            <select name="gender" required className="w-full px-4 py-2 border rounded-md">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Contact Info Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number *</label>
            <input
              type="tel"
              name="phone_number"
              required
              minLength={10}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Country *</label>
            <select name="country" required className="w-full px-4 py-2 border rounded-md">
              <option value="">Select...</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Address Fields */}
        <div>
          <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
          <input
            type="text"
            name="address_line1"
            required
            minLength={5}
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address Line 2</label>
          <input
            type="text"
            name="address_line2"
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City *</label>
            <input
              type="text"
              name="city"
              required
              minLength={2}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">State/Province *</label>
            <input
              type="text"
              name="state"
              required
              minLength={2}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Postal Code *</label>
            <input
              type="text"
              name="zip_code"
              required
              minLength={3}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>
        </div>

        {/* Optional Fields */}
        <div>
          <label className="block text-sm font-medium mb-2">Occupation</label>
          <input
            type="text"
            name="occupation"
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Continue to Policy Selection'}
        </button>
      </form>
    </div>
  )
}
