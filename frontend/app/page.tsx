'use client'

import { useState } from 'react'
import { Lock, Clock } from 'lucide-react'
import { RBACStatCard } from '@/components/rbac-stat-card'
import { CurrentContractCard } from '@/components/current-contract-card'
import { RecentActivityCard } from '@/components/recent-activity-card'
import { EmptyContractState } from '@/components/empty-contract-state'

export default function RBACControlPanel() {
  const [isLoading] = useState(false)
  const [contractDeployed] = useState(true)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Header skeleton */}
            <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
            {/* Stats skeleton */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!contractDeployed) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">RBAC Control Panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage roles and permissions for your deployed contracts
            </p>
          </div>
          <EmptyContractState />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">RBAC Control Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage roles and permissions for your deployed contracts
          </p>
        </div>

        {/* Statistics Section */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
          <RBACStatCard
            icon={<Lock className="h-5 w-5 text-primary" />}
            label="Active Roles"
            value="8"
            description="Roles defined"
          />
          <RBACStatCard
            icon={<Clock className="h-5 w-5 text-primary" />}
            label="Total Role Grants"
            value="42"
            description="Granted permissions"
          />
          <RBACStatCard
            icon={<Lock className="h-5 w-5 text-accent" />}
            label="Expiring Soon"
            value="3"
            description="In next 24 hours"
          />
        </div>

        {/* Current Contract Section */}
        <div className="mb-8">
          <CurrentContractCard />
        </div>

        {/* Recent Activity Section */}
        <div>
          <RecentActivityCard />
        </div>
      </main>
    </div>
  )
}
