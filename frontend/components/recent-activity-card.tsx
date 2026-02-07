import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut } from 'lucide-react'

const activities = [
  {
    id: 1,
    role: 'admin',
    address: '0x5f3a...7c9e',
    action: 'Granted',
    timestamp: '5 min ago',
  },
  {
    id: 2,
    role: 'moderator',
    address: '0x2b1d...4a6f',
    action: 'Granted',
    timestamp: '15 min ago',
  },
  {
    id: 3,
    role: 'viewer',
    address: '0x8e4c...1b3d',
    action: 'Revoked',
    timestamp: '1 hour ago',
  },
  {
    id: 4,
    role: 'admin',
    address: '0x3f6b...9d2e',
    action: 'Granted',
    timestamp: '2 hours ago',
  },
  {
    id: 5,
    role: 'editor',
    address: '0x7a1c...5e8f',
    action: 'Revoked',
    timestamp: '3 hours ago',
  },
]

export function RecentActivityCard() {
  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  {activity.action === 'Granted' ? (
                    <LogIn className="h-4 w-4 text-primary" />
                  ) : (
                    <LogOut className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {activity.role}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {activity.address}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                <Badge
                  variant={activity.action === 'Granted' ? 'default' : 'secondary'}
                  className={`text-xs ${
                    activity.action === 'Granted'
                      ? 'bg-green-100 text-green-900 hover:bg-green-100'
                      : 'bg-orange-100 text-orange-900 hover:bg-orange-100'
                  }`}
                >
                  {activity.action}
                </Badge>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
