'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

const contracts = [
  {
    id: 1,
    name: 'TokenFactory',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e2d',
    version: 'v2.1.0',
    status: 'active',
    lastDeployed: '2 days ago',
  },
  {
    id: 2,
    name: 'Governance',
    address: '0x3e2b5a1f7f4a9c8e6d2b1a5f7c4e8d9a2b1f5a7',
    version: 'v1.5.2',
    status: 'active',
    lastDeployed: '5 days ago',
  },
  {
    id: 3,
    name: 'StakingPool',
    address: '0x9c1a2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    version: 'v3.0.1',
    status: 'maintenance',
    lastDeployed: '1 day ago',
  },
  {
    id: 4,
    name: 'Treasury',
    address: '0x5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    version: 'v1.2.0',
    status: 'active',
    lastDeployed: '1 week ago',
  },
]

export function ContractsList() {
  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition-colors cursor-pointer group"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                {contract.name}
              </h3>
              <Badge
                variant={contract.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {contract.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-muted-foreground truncate">
              {contract.address}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">v{contract.version}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Deployed {contract.lastDeployed}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      ))}
    </div>
  )
}
