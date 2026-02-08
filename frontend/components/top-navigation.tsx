'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Zap, Home, Users, Rocket } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/roles', label: 'Roles', icon: Users },
  { href: '/deploy', label: 'Deploy', icon: Rocket },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [network, setNetwork] = useState<'testnet' | 'local'>('testnet')
  const [isSwitching, setIsSwitching] = useState(false)

  const handleNetworkChange = async (newNetwork: 'testnet' | 'local') => {
    if (newNetwork === network) return
    
    setIsSwitching(true)
    
    // Simulate network switch delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setNetwork(newNetwork)
    setIsSwitching(false)
    toast.success(`Switched to ${newNetwork === 'testnet' ? 'Testnet' : 'Local'} network`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Product Name */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">Stellar Keystone</h1>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`gap-2 ${isActive ? 'bg-secondary' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Right: Network Status + Network Dropdown */}
        <div className="flex items-center gap-3">
          {/* Network Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs sm:text-sm h-9 bg-card border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
                disabled={isSwitching}
              >
                {isSwitching ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <>
                    <div
                      className={`h-2 w-2 rounded-full ${network === 'testnet'
                        ? 'bg-warning animate-pulse'
                        : 'bg-accent animate-pulse'
                        }`}
                    />
                    {network === 'testnet' ? 'Testnet' : 'Local'}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => handleNetworkChange('testnet')}
                className="cursor-pointer"
                disabled={network === 'testnet'}
              >
                <div className="h-2 w-2 rounded-full bg-warning mr-2" />
                <span>Testnet</span>
                {network === 'testnet' && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleNetworkChange('local')}
                className="cursor-pointer"
                disabled={network === 'local'}
              >
                <div className="h-2 w-2 rounded-full bg-accent mr-2" />
                <span>Local</span>
                {network === 'local' && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Contract Badge - only on larger screens */}
          <Badge variant="outline" className="hidden lg:flex gap-2 bg-secondary/50">
            <span className="text-xs text-muted-foreground">Contract:</span>
            <span className="text-xs font-mono">0x742d...2e2d</span>
          </Badge>
        </div>
      </div>
    </header>
  )
}
