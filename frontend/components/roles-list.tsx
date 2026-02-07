'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Loader2 } from 'lucide-react'

interface Role {
  id: string
  name: string
  isAdmin: boolean
  memberCount: number
}

interface RolesListProps {
  roles: Role[]
  isLoading?: boolean
}

export function RolesList({ roles, isLoading = false }: RolesListProps) {
  const router = useRouter()
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (roles.length === 0) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No roles defined yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first role to get started
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Create your first role
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="border-b border-border">
        <CardTitle>Roles</CardTitle>
        <CardDescription>{roles.length} roles defined</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {roles.map((role) => (
            <div
              key={role.id}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
              className="flex items-center justify-between px-0 py-4 hover:bg-secondary/30 transition-colors cursor-pointer -mx-6 px-6"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono text-primary font-medium">
                    {role.name}
                  </code>
                  {role.isAdmin && (
                    <Badge variant="default" className="text-xs">
                      Admin Role
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{role.memberCount} members</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/roles/${role.id}`)}
                  >
                    View Members
                  </Button>
                  {hoveredRoleId === role.id && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
