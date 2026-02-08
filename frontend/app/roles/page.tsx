'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowRight, Users, Plus, Search } from 'lucide-react'
import { RolesList } from '@/components/roles-list'
import { CreateRoleModal } from '@/components/create-role-modal'
import { toast } from 'sonner'

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [roles, setRoles] = useState([
    { id: 'admin', name: 'Admin', isAdmin: true, memberCount: 3 },
    { id: 'moderator', name: 'Moderator', isAdmin: false, memberCount: 8 },
    { id: 'user', name: 'User', isAdmin: false, memberCount: 24 },
  ])

  // Filter roles based on search query
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles
    
    const query = searchQuery.toLowerCase()
    return roles.filter(role => 
      role.name.toLowerCase().includes(query) || 
      role.id.toLowerCase().includes(query)
    )
  }, [roles, searchQuery])

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
    toast.success(`Role "${data.roleName}" created successfully`)
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search roles by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary/20 focus:border-primary/40"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-muted-foreground">
              Found {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Roles List */}
        <RolesList roles={filteredRoles} isLoading={isLoading} />

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
