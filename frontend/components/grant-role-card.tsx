'use client'

import React from "react"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Loader2 } from 'lucide-react'

const SUGGESTED_ADDRESSES = [
  { label: 'Deployer Address', address: 'GAAA7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ' },
  { label: 'Admin Address', address: 'GCCCA7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ' },
  { label: 'Recent: 0x7f4a...9c8e', address: 'GDDDB7AQRVQ4LRVQCF5LQHVZFGSMVVVLP4CEKPQRH5PXEQJGFHDZ3ZPYQNQ' },
]

interface GrantRoleCardProps {
  isLoading: boolean
  onGrant: (address: string, expiry: Date | null) => Promise<void>
}

export function GrantRoleCard({ isLoading, onGrant }: GrantRoleCardProps) {
  const [address, setAddress] = useState('')
  const [neverExpires, setNeverExpires] = useState(true)
  const [expiryDate, setExpiryDate] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState('')

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
    setError('')
    setShowSuggestions(e.target.value.length > 0)
  }

  const selectSuggestedAddress = (suggestionAddress: string) => {
    setAddress(suggestionAddress)
    setShowSuggestions(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!address.trim()) {
      setError('Please enter an address')
      return
    }

    if (address.trim().length < 40) {
      setError('Invalid address format')
      return
    }

    if (!neverExpires && !expiryDate) {
      setError('Please select an expiry date')
      return
    }

    try {
      const expiry = neverExpires ? null : new Date(expiryDate)
      await onGrant(address.trim(), expiry)
      setAddress('')
      setExpiryDate('')
      setNeverExpires(true)
      setError('')
    } catch (err) {
      setError('Failed to grant role. Please try again.')
    }
  }

  const filteredSuggestions = showSuggestions
    ? SUGGESTED_ADDRESSES.filter((s) => s.address.toLowerCase().includes(address.toLowerCase()))
    : []

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Grant Role</CardTitle>
        <CardDescription>Add a new member to this role</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Input */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground block mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="Enter account address..."
              disabled={isLoading}
              className="w-full px-3 py-2 border border-primary/20 rounded-md bg-card text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />

            {/* Address Suggestions */}
            {filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 border border-border bg-card rounded-md shadow-md z-10">
                {filteredSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestedAddress(suggestion.address)}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b border-border last:border-b-0"
                  >
                    <p className="font-medium text-foreground">{suggestion.label}</p>
                    <p className="text-muted-foreground font-mono text-xs mt-1">
                      {suggestion.address.slice(0, 10)}...{suggestion.address.slice(-8)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Section */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground block">Expiry</label>

            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-secondary/30">
              <input
                type="checkbox"
                id="neverExpires"
                checked={neverExpires}
                onChange={(e) => {
                  setNeverExpires(e.target.checked)
                  setExpiryDate('')
                }}
                disabled={isLoading}
                className="rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="neverExpires" className="text-sm text-foreground cursor-pointer flex-1">
                Never expires
              </label>
            </div>

            {!neverExpires && (
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-primary/20 rounded-md bg-card text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Granting...
              </>
            ) : (
              'Grant Role'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
