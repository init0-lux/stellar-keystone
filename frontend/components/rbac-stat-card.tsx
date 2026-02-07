import { Card, CardContent } from '@/components/ui/card'
import React from 'react'

interface RBACStatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  description: string
}

export function RBACStatCard({ icon, label, value, description }: RBACStatCardProps) {
  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
