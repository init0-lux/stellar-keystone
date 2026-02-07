'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { RoleMetadataCard } from '@/components/role-metadata-card'
import { MembersTable } from '@/components/members-table'
import { GrantRoleCard } from '@/components/grant-role-card'

const MOCK_MEMBERS = [
  {
    id: '1',
    address: 'GAAA7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ',
    shortAddress: 'GAAA...PNQNQ',
    expiry: null,
    status: 'Active',
  },
  {
    id: '2',
    address: 'GBBB7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ',
    shortAddress: 'GBBB...PNQNQ',
    expiry: '2024-12-31',
    status: 'Active',
  },
  {
    id: '3',
    address: 'GCCC7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ',
    shortAddress: 'GCCC...PNQNQ',
    expiry: '2024-01-15',
    status: 'Expired',
  },
] as const

export default function RoleMembersPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = use(params)
  const [members, setMembers] = useState<any[]>(MOCK_MEMBERS as any) // Cast to any to avoid readonly issues with MOCK_MEMBERS
  const [isGranting, setIsGranting] = useState(false)

  // Fetch role metadata from API
  const [metadata, setMetadata] = useState<{ description?: string, permissions?: string[] } | null>(null)

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`/api/roles/${roleId}`)
        if (res.ok) {
          const data = await res.json()
          setMetadata(data)
        }
      } catch (error) {
        console.error('Failed to fetch role metadata', error)
      }
    }
    fetchMetadata()
  }, [roleId])

  // Generate role data based on ID and fetched metadata
  const roleName = roleId.charAt(0).toUpperCase() + roleId.slice(1).replace(/-/g, ' ')

  const role = {
    id: roleId,
    name: roleName,
    isAdmin: roleId === 'admin',
    memberCount: members.length,
    description: metadata?.description,
    permissions: metadata?.permissions
  }

  const handleGrantRole = async (address: string, expiry: Date | null) => {
    setIsGranting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const newMember = {
        id: String(members.length + 1),
        address,
        shortAddress: address.slice(0, 4) + '...' + address.slice(-6),
        expiry: expiry ? expiry.toISOString().split('T')[0] : null,
        status: 'Active',
      }

      setMembers([newMember, ...members])
    } finally {
      setIsGranting(false)
    }
  }

  const handleRevokeMember = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId))
  }

  const isEmpty = members.length === 0

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/roles" className="hover:text-foreground transition-colors">
            Roles
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{role.name}</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Role: {role.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage accounts assigned to this role</p>
        </div>

        {/* Top Section: Metadata & Grant Role */}
        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          {/* Left: Role Metadata */}
          <div>
            <RoleMetadataCard role={role} />
          </div>

          {/* Right: Grant Role Form */}
          <div>
            <GrantRoleCard isLoading={isGranting} onGrant={handleGrantRole} />
          </div>
        </div>

        {/* Bottom Section: Members Table */}
        <div className="w-full">
          <MembersTable members={members} isEmpty={isEmpty} onRevoke={handleRevokeMember} />
        </div>
      </main>
    </div>
  )
}
