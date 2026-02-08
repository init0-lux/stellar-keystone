'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, CheckCircle, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deployContract } from '@/lib/rbac-sdk'
import { mutate } from 'swr' // Global mutate to refresh stats

type DeploymentState = 'idle' | 'loading' | 'success' | 'error'

interface DeploymentResult {
  contractAddress?: string
  error?: string
  txHash?: string
}

export default function DeployPage() {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle')
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  const [network, setNetwork] = useState('testnet')
  const [deployerKey, setDeployerKey] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDeploy = async () => {
    if (!deployerKey) {
      toast.error('Please enter a secret key');
      return;
    }

    setDeploymentState('loading')
    setDeploymentResult(null)
    toast.info('Deploying contract...', {
      description: 'This may take a minute...',
    })

    try {
      const result = await deployContract(network, deployerKey);

      if (result.success && result.data?.contractId) {
        const contractAddress = result.data.contractId;

        setDeploymentState('success')
        setDeploymentResult({
          contractAddress,
          txHash: result.txHash
        })

        toast.success('Contract deployed successfully!', {
          description: `Address: ${contractAddress.slice(0, 8)}...`,
        })

        // TODO: Auto-update configure? 
        // For now, we just show it. Ideally we should have a button to "Use this contract"
        // which updates localStorage overlay or prompts user to update .env

      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      setDeploymentState('error')
      setDeploymentResult({
        error: error.message || 'Failed to deploy contract',
      })
      toast.error('Deployment failed', {
        description: error.message,
      })
    }
  }

  const handleCopyAddress = async () => {
    if (deploymentResult?.contractAddress) {
      await navigator.clipboard.writeText(deploymentResult.contractAddress)
      setCopied(true)
      toast.success('Contract address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isFormDisabled = deploymentState === 'loading' || deploymentState === 'success'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Deploy RBAC Contract</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Deploy a new Role-Based Access Control contract to manage permissions across your infrastructure
          </p>
        </div>

        {/* Main Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">Deployment Configuration</CardTitle>
            <CardDescription>Set up your RBAC contract with the details below</CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Network Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Network</label>
              <Select value={network} onValueChange={setNetwork} disabled={isFormDisabled}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deployer Key Input (Replaces read-only address) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Deployer Secret Key</label>
              <div className="rounded-md border border-border bg-secondary/50 px-3 py-2">
                <input
                  type="password"
                  value={deployerKey}
                  onChange={(e) => setDeployerKey(e.target.value)}
                  placeholder="S..."
                  disabled={isFormDisabled}
                  className="w-full bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Required to sign the deployment transaction
              </p>
            </div>

            {/* Success Alert */}
            {deploymentState === 'success' && deploymentResult?.contractAddress && (
              <Alert className="border-success/30 bg-gradient-to-br from-success/10 to-success/5">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="ml-2">
                  <p className="font-semibold text-foreground">Contract deployed successfully!</p>
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-card border border-success/20 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Contract Address</p>
                      <code className="text-sm text-foreground font-mono break-all block">
                        {deploymentResult.contractAddress}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyAddress}
                      className="text-success hover:text-success/80 transition-colors"
                      title="Copy contract address"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground text-center">
                    Update your <code>.env.local</code> with this ID to manage it.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {deploymentState === 'error' && deploymentResult?.error && (
              <Alert className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="ml-2 text-foreground font-medium">
                  {deploymentResult.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t border-border">
              {deploymentState === 'success' ? (
                <>
                  <Button className="w-full h-10" size="lg" onClick={() => window.location.href = '/'}>
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 bg-transparent"
                    onClick={() => {
                      setDeploymentState('idle')
                      setDeploymentResult(null)
                    }}
                  >
                    Deploy Another
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleDeploy}
                  disabled={deploymentState === 'loading' || !deployerKey}
                  className="w-full h-10"
                  size="lg"
                >
                  {deploymentState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    'Deploy Contract'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
