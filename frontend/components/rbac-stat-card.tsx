'use client'

import { Card, CardContent } from '@/components/ui/card'
import React from 'react'

interface RBACStatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  description: string
  color?: 'primary' | 'accent' | 'success' | 'warning'
}

export function RBACStatCard({ icon, label, value, description, color = 'primary' }: RBACStatCardProps) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    accent: 'from-accent/10 to-accent/5 border-accent/20',
    success: 'from-success/10 to-success/5 border-success/20',
    warning: 'from-warning/10 to-warning/5 border-warning/20',
  }

  const iconColorClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <Card className={`border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br ${colorClasses[color]}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className={iconColorClasses[color]}>
                {icon}
              </div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
