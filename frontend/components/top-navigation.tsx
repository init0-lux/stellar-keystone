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

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/roles', label: 'Roles', icon: Users },
  { href: '/deploy', label: 'Deploy', icon: Rocket },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [network, setNetwork] = useState<'testnet' | 'local'>('testnet')

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
                className="gap-2 text-xs sm:text-sm h-9 bg-transparent"
              >
                <div
                  className={`h-2 w-2 rounded-full ${network === 'testnet'
                    ? 'bg-amber-500'
                    : 'bg-purple-500'
                    }`}
                />
                {network === 'testnet' ? 'Testnet' : 'Local'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem
                onClick={() => setNetwork('testnet')}
                className="cursor-pointer"
              >
                <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Testnet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setNetwork('local')}
                className="cursor-pointer"
              >
                <div className="h-2 w-2 rounded-full bg-purple-500 mr-2" />
                Local
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
