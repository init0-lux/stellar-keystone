'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Database, Users } from 'lucide-react'

interface NetworkStatusProps {
  network: 'testnet' | 'local'
}

export function NetworkStatus({ network }: NetworkStatusProps) {
  const isTestnet = network === 'testnet'
  const statusData = isTestnet
    ? {
        name: 'Ethereum Sepolia Testnet',
        chainId: 11155111,
        gasPrice: '82.5',
        gasUnit: 'gwei',
        nodes: 147,
        validators: 432,
        avgBlockTime: 12.5,
      }
    : {
        name: 'Local Network',
        chainId: 31337,
        gasPrice: '1.0',
        gasUnit: 'gwei',
        nodes: 3,
        validators: 1,
        avgBlockTime: 2.1,
      }

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Network Status</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                isTestnet ? 'bg-amber-500 animate-pulse' : 'bg-purple-500'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isTestnet ? 'Testnet' : 'Local'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Network</p>
          <p className="text-sm font-medium text-foreground">{statusData.name}</p>
          <p className="text-xs text-muted-foreground mt-1">Chain ID: {statusData.chainId}</p>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Gas Price</span>
            <span className="text-sm font-medium text-foreground">
              {statusData.gasPrice} {statusData.gasUnit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Block Time</span>
            <span className="text-sm font-medium text-foreground">
              {statusData.avgBlockTime}s
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active Nodes</span>
            <span className="text-sm font-medium text-foreground">
              {statusData.nodes}
            </span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">All systems operational</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Database healthy</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{statusData.validators} validators</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
