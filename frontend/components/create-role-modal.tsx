'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface CreateRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { roleName: string; adminRole: string }) => void
  existingRoles: Array<{ id: string; name: string }>
  isLoading?: boolean
}

export function CreateRoleModal({
  isOpen,
  onClose,
  onSubmit,
  existingRoles,
  isLoading = false,
}: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState('')
  const [adminRole, setAdminRole] = useState('')
  // const [isSubmitting, setIsSubmitting] = useState(false) // Controlled by parent now via isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) return

    // setIsSubmitting(true)
    // try {
    // await new Promise((resolve) => setTimeout(resolve, 500))
    onSubmit({ roleName, adminRole })
    // setRoleName('')
    // setAdminRole('')
    // } finally {
    // setIsSubmitting(false)
    // }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setRoleName('')
      setAdminRole('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Define a new role and assign an admin to manage it
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Name Input */}
          <div className="space-y-2">
            <Label htmlFor="role-name" className="text-sm font-medium">
              Role Name
            </Label>
            <Input
              id="role-name"
              placeholder="e.g., Editor, Reviewer"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              disabled={isLoading}
              className="border-border"
            />
          </div>

          {/* Admin Role Select */}
          <div className="space-y-2">
            <Label htmlFor="admin-role" className="text-sm font-medium">
              Admin Role
            </Label>
            <Select value={adminRole} onValueChange={setAdminRole} disabled={isLoading}>
              <SelectTrigger id="admin-role" className="border-border">
                <SelectValue placeholder="Select an admin role" />
              </SelectTrigger>
              <SelectContent>
                {existingRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !roleName.trim()} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
