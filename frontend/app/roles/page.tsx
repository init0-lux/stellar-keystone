'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, Plus } from 'lucide-react'
import { RolesList } from '@/components/roles-list'
import { CreateRoleModal } from '@/components/create-role-modal'

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [roles, setRoles] = useState([
    { id: 'admin', name: 'Admin', isAdmin: true, memberCount: 3 },
    { id: 'moderator', name: 'Moderator', isAdmin: false, memberCount: 8 },
    { id: 'user', name: 'User', isAdmin: false, memberCount: 24 },
  ])

  const handleCreateRole = (data: { roleName: string; adminRole: string }) => {
    console.log('[v0] Creating role:', data)

    const newRole = {
      id: data.roleName.toLowerCase().replace(/\s+/g, '-'),
      name: data.roleName,
      isAdmin: false,
      memberCount: 0
    }

    setRoles([...roles, newRole])
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Define and manage permission roles
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Roles List */}
        <RolesList roles={roles} isLoading={isLoading} />

        {/* Create Role Modal */}
        <CreateRoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateRole}
          existingRoles={roles}
        />
      </main>
    </div>
  )
}
