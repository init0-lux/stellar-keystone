'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Clock, Shield, Trash2, UserPlus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useRoleMembers, useRoles } from '@/lib/api-client'
import { grantUserRole, revokeUserRole } from '@/lib/rbac-sdk'
import { formatDistanceToNow, isPast } from 'date-fns'

interface RoleMember {
  account: string
  expiry: number | null
  lastUpdated: string
}

export default function RoleDetailsPage({ params }: { params: Promise<{ roleId: string }> }) {
  const router = useRouter()
  // Unwrap params using React.use() or await (Next.js 15 async params)
  const { roleId } = use(params)

  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const { members, isLoading, isError, refreshMembers } = useRoleMembers(contractId, roleId);
  const { roles } = useRoles(contractId);

  const [newMemberAddress, setNewMemberAddress] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [processingState, setProcessingState] = useState<Record<string, boolean>>({})

  const roleDetails = roles?.find(r => r.id === roleId);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberAddress.trim() || !contractId) return

    const signerKey = prompt('Please enter your Secret Key (S...) to sign this transaction:');
    if (!signerKey) return;

    setIsAddingMember(true)
    toast.info(`Granting role ${roleId}...`);

    const result = await grantUserRole(contractId, roleId, newMemberAddress.trim(), undefined, signerKey);

    if (result.success) {
      toast.success('Member added successfully', { description: `Tx: ${result.txHash?.slice(0, 8)}...` });
      setNewMemberAddress('')
      setTimeout(() => refreshMembers(), 4000);
    } else {
      toast.error('Failed to add member', { description: result.error });
    }

    setIsAddingMember(false);
  }

  const handleRemoveMember = async (memberAddress: string) => {
    if (!contractId) return;

    // Confirm first
    if (!confirm(`Are you sure you want to revoke role ${roleId} from ${memberAddress}?`)) return;

    const signerKey = prompt('Please enter your Secret Key (S...) to sign this transaction:');
    if (!signerKey) return;

    setProcessingState(prev => ({ ...prev, [memberAddress]: true }));
    toast.info(`Revoking role...`);

    const result = await revokeUserRole(contractId, roleId, memberAddress, signerKey);

    if (result.success) {
      toast.success('Member removed successfully');
      setTimeout(() => refreshMembers(), 4000);
    } else {
      toast.error('Failed to remove member', { description: result.error });
    }

    setProcessingState(prev => ({ ...prev, [memberAddress]: false }));
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading role details...</div>
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive flex flex-col items-center">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>Failed to load role details. Check indexer connection.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 pl-0 hover:bg-transparent hover:text-primary transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </Button>

        {/* Header */}
        <div className="mb-8 p-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-foreground">{roleDetails?.name || roleId}</h1>
                  {roleDetails?.adminRole && <Badge variant="secondary">Admin: {roleDetails.adminRole}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{roleId}</code> • {members?.length || 0} active members
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Members List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle>Role Members</CardTitle>
                <CardDescription>Accounts granted this role</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {!members || members.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No members assigned to this role yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {members.map((member) => {
                      const isExpired = member.expiry ? isPast(new Date(member.expiry * 1000)) : false;
                      return (
                        <div key={member.account} className="flex items-center justify-between py-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono text-foreground break-all">
                                {member.account}
                              </code>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[10px] h-5">Expired</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {member.expiry
                                  ? `Expires ${formatDistanceToNow(new Date(member.expiry * 1000), { addSuffix: true })}`
                                  : 'Never expires'}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(member.account)}
                            disabled={processingState[member.account]}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Member Form */}
          <div className="space-y-6">
            <Card className="border border-border shadow-sm sticky top-8">
              <CardHeader className="border-b border-border">
                <CardTitle>Add Member</CardTitle>
                <CardDescription>Grant this role to a new account</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Account Address</label>
                    <Input
                      placeholder="G..."
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the Public Key (starts with G) of the account to add.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isAddingMember || !newMemberAddress.trim()}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isAddingMember ? 'Granting...' : 'Grant Role'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
