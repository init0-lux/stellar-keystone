'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowRight, Users, Plus, Search, Loader2 } from 'lucide-react'
import { RolesList } from '@/components/roles-list'
import { CreateRoleModal } from '@/components/create-role-modal'
import { toast } from 'sonner'
import { useRoles } from '@/lib/api-client'
import { createNewRole } from '@/lib/rbac-sdk'
import { useContract } from '@/lib/api-client'

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const { roles, isLoading, isError, refreshRoles } = useRoles(contractId);
  const { contract } = useContract(contractId);

  // Filter roles based on search query
  const filteredRoles = useMemo(() => {
    if (!roles) return [];

    // Map backend roles to UI model
    // Assuming UI expects: id, name, isAdmin, memberCount
    const uiRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      // Mark as "admin" if it's the root admin role or has Admin in name
      isAdmin: role.id.toLowerCase().includes('admin') || role.id === (contract as any)?.admin_role,
      memberCount: role.memberCount
    }));

    if (!searchQuery.trim()) return uiRoles;

    const query = searchQuery.toLowerCase()
    return uiRoles.filter(role =>
      role.name.toLowerCase().includes(query) ||
      role.id.toLowerCase().includes(query)
    )
  }, [roles, searchQuery, contract])

  const handleCreateRole = async (data: { roleName: string; adminRole: string }) => {
    if (!contractId) {
      toast.error('No contract configured');
      return;
    }

    const signerKey = prompt('Please enter your Secret Key (S...) to sign this transaction:');
    if (!signerKey) return;

    setIsCreating(true);
    toast.info('Creating role...', { description: 'Waiting for transaction confirmation' });

    const result = await createNewRole(contractId, data.roleName, data.adminRole, signerKey);

    if (result.success) {
      toast.success(`Role "${data.roleName}" created!`, {
        description: `Transaction: ${result.txHash?.slice(0, 8)}...`
      });
      setIsModalOpen(false);
      // Optimistic update or refresh
      setTimeout(() => refreshRoles(), 4000);
    } else {
      toast.error('Failed to create role', { description: result.error });
    }

    setIsCreating(false);
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-8 flex justify-center">
        <div className="text-destructive">Failed to load roles. Is the indexer running?</div>
      </div>
    );
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
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0" disabled={isLoading || !contractId}>
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
          {(roles) && (
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
          existingRoles={roles || []}
          isLoading={isCreating}
        />
      </main>
    </div>
  )
}
