'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Lock, TrendingUp, Clock } from 'lucide-react'

const metrics = [
  {
    id: 'uptime',
    label: 'Network Uptime',
    value: '99.98%',
    change: '+0.2%',
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  {
    id: 'security',
    label: 'Security Score',
    value: '98/100',
    change: 'Excellent',
    icon: Lock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'transactions',
    label: 'Total Transactions',
    value: '24,532',
    change: '+234 today',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  {
    id: 'latency',
    label: 'Avg Latency',
    value: '142ms',
    change: '-8ms vs last week',
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
  },
]

export function DashboardMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const IconComponent = metric.icon
        return (
          <Card
            key={metric.id}
            className={`border ${metric.bgColor} shadow-sm hover:shadow-md transition-shadow`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.change}</p>
                </div>
                <div className={`rounded-lg bg-white/50 p-2.5 ${metric.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
