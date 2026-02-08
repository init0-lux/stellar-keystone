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
import { Copy, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

type DeploymentState = 'idle' | 'loading' | 'success' | 'error'

interface DeploymentResult {
  contractAddress?: string
  error?: string
}

export default function DeployPage() {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle')
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  const [network, setNetwork] = useState('testnet')
  const [deployerAddress, setDeployerAddress] = useState('G7QSTFL7NZ67ISVHGKORNPYQXOVOJ73EIXNW5QMAIJVGX32LPRVX45NQ')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [adminAddress, setAdminAddress] = useState('')
  const [copied, setCopied] = useState(false)

  const handleDeploy = async () => {
    setDeploymentState('loading')
    setDeploymentResult(null)
    toast.info('Deploying contract...', {
      description: 'This may take a few moments',
    })

    // Simulate deployment process
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock success
      const contractAddress = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5AWAOEJKQQA7Q3XM'
      setDeploymentState('success')
      setDeploymentResult({
        contractAddress,
      })
      toast.success('Contract deployed successfully!', {
        description: `Address: ${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}`,
      })
    } catch (error) {
      setDeploymentState('error')
      setDeploymentResult({
        error: 'Failed to deploy contract. Please check your wallet connection and try again.',
      })
      toast.error('Deployment failed', {
        description: 'Please check your wallet connection and try again',
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
              <p className="text-xs text-muted-foreground">
                {network === 'local' ? 'Local Soroban network' : 'Stellar Testnet network'}
              </p>
            </div>

            {/* Deployer Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Deployer Address</label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                <input
                  type="text"
                  value={deployerAddress}
                  readOnly
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deployerAddress)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Connected wallet address (read-only)
              </p>
            </div>

            {/* Advanced Section */}
            <div className="space-y-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                disabled={isFormDisabled}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Initial Admin Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter admin address to override default"
                      value={adminAddress}
                      onChange={(e) => setAdminAddress(e.target.value)}
                      disabled={isFormDisabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use deployer address as admin
                    </p>
                  </div>
                </div>
              )}
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
                  <Button className="w-full h-10" size="lg">
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 bg-transparent"
                    onClick={() => {
                      setDeploymentState('idle')
                      setDeploymentResult(null)
                      setAdminAddress('')
                      setShowAdvanced(false)
                    }}
                  >
                    Deploy Another
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleDeploy}
                  disabled={deploymentState === 'loading'}
                  className="w-full h-10"
                  size="lg"
                >
                  {deploymentState === 'loading' ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⚙️</span>
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

        {/* Helper Text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          This will deploy an RBAC contract to the {network === 'local' ? 'local' : 'Stellar Testnet'} network
        </p>
      </div>
    </div>
  )
}
