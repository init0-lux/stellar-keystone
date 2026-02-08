'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut, Activity } from 'lucide-react'
import { useActivity } from '@/lib/api-client'
import { formatDistanceToNow } from 'date-fns'

function getActivityIcon(eventType: string) {
  if (eventType === 'RoleGranted') return <LogIn className="h-4 w-4 text-success" />;
  if (eventType === 'RoleRevoked') return <LogOut className="h-4 w-4 text-warning" />;
  return <Activity className="h-4 w-4 text-primary" />;
}

function getActivityColor(eventType: string) {
  if (eventType === 'RoleGranted') return 'success';
  if (eventType === 'RoleRevoked') return 'warning';
  return 'primary';
}

export function RecentActivityCard() {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const { activity, isLoading } = useActivity(contractId);

  if (isLoading) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 spacy-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse mb-3" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!activity || activity.length === 0) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 text-center py-8">
          <p className="text-muted-foreground">No recent activity found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {activity.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 bg-${getActivityColor(item.eventType)}/10`}>
                  {getActivityIcon(item.eventType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {item.payload?.role || 'Unknown Role'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                      {item.payload?.account || item.txHash}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-${getActivityColor(item.eventType)}/10`}>
                  <div className={`h-1.5 w-1.5 rounded-full bg-${getActivityColor(item.eventType)}`} />
                  <span className={`text-xs font-medium text-${getActivityColor(item.eventType)}`}>
                    {item.eventType.replace('Role', '')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
