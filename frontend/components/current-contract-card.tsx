'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'

export function CurrentContractCard() {
  const [copied, setCopied] = useState(false)

  const contractAddress = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Current Contract</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Contract Address
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary p-3 text-sm font-mono text-foreground break-all">
                {contractAddress}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Network
              </p>
              <Badge variant="secondary" className="text-xs">
                Testnet
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Status
              </p>
              <Badge className="text-xs bg-green-100 text-green-900 hover:bg-green-100">
                Active
              </Badge>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              This is your Stellar Soroban RBAC contract deployment. Use this address to manage roles and grant permissions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
