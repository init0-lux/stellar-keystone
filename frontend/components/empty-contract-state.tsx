import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GitBranch } from 'lucide-react'

export function EmptyContractState() {
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="pt-12 pb-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-lg bg-secondary p-3 mb-4">
            <GitBranch className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No Contract Deployed
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            You haven't deployed an RBAC contract yet. Deploy one now to start managing roles and permissions.
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Deploy RBAC Contract
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
