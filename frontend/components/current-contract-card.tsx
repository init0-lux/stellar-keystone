'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useContract } from '@/lib/api-client'

export function CurrentContractCard() {
  const [copied, setCopied] = useState(false)
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const { contract, isLoading, isError } = useContract(contractId);

  const displayAddress = contractId || 'No Contract Configured';

  const handleCopy = async () => {
    if (contractId) {
      await navigator.clipboard.writeText(contractId)
      setCopied(true)
      toast.success('Contract address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isError && contractId) {
    // If we have a contract ID but it's not in the indexer, show warning
    // Or if API failed
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
                {displayAddress}
              </code>
              <button
                onClick={handleCopy}
                disabled={!contractId}
                className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
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
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  {contract?.network || (contractId ? 'Testnet' : 'Unknown')}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Status
              </p>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                ) : (
                  <>
                    <div className={`h-2 w-2 rounded-full ${contract ? 'bg-success' : 'bg-destructive'} animate-pulse`} />
                    <span className={`text-sm font-medium ${contract ? 'text-success' : 'text-destructive'}`}>
                      {contract ? 'Active' : (isError ? 'Indexer Error' : 'Not Indexed')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              {contract
                ? 'Contract is indexed and active. Use this address to manage roles and grant permissions.'
                : 'Wait for the indexer to pick up this contract, or verify the contract ID in configuration.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
