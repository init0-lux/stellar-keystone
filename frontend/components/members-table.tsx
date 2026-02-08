'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  address: string
  shortAddress: string
  expiry: string | null
  status: 'Active' | 'Expired'
}

interface MembersTableProps {
  members: Member[]
  isEmpty: boolean
  onRevoke: (memberId: string) => void
}

export function MembersTable({ members, isEmpty, onRevoke }: MembersTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const copyToClipboard = async (address: string, memberId: string) => {
    await navigator.clipboard.writeText(address)
    setCopiedId(memberId)
    toast.success('Address copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (memberId: string) => {
    setRevokingId(memberId)
    await onRevoke(memberId)
    setRevokingId(null)
  }

  const formatExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return 'Never'
    const date = new Date(expiryDate)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Members</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No members assigned to this role yet</p>
            <p className="text-xs text-muted-foreground">
              Use the Grant Role form to add the first member
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-0 text-left font-medium text-muted-foreground">Address</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Expiry</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-4 px-0">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-foreground bg-secondary/50 px-2 py-1 rounded">
                          {member.shortAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(member.address, member.id)}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                          title="Copy full address"
                        >
                          {copiedId === member.id ? (
                            <span className="text-xs text-primary">Copied</span>
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{formatExpiry(member.expiry)}</td>
                    <td className="py-4 px-4">
                      {member.status === 'Active' ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          <span className="text-sm text-success font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Expired</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(member.id)}
                        disabled={revokingId === member.id}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Revoke role"
                      >
                        {revokingId === member.id ? (
                          <Loader2 className="h-4 w-4 text-destructive animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive hover:text-destructive" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
