'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface RoleMetadata {
  id: string
  name: string
  isAdmin: boolean
  memberCount: number
  description?: string
  permissions?: string[]
}

interface RoleMetadataCardProps {
  role: RoleMetadata
}

export function RoleMetadataCard({ role }: RoleMetadataCardProps) {
  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mt-1">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold mb-1">{role.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {role.description || `Manage members and permissions for the ${role.name} role.`}
              </p>
            </div>
          </div>
          {role.isAdmin && (
            <Badge variant="default" className="text-xs shrink-0">
              Admin Role
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 flex-1 flex flex-col justify-between gap-6">

        {/* Permissions Section */}
        {role.permissions && role.permissions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((perm) => (
                <Badge key={perm} variant="outline" className="bg-secondary/50 font-mono text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mt-auto">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Members</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{role.memberCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400">
              Active
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
