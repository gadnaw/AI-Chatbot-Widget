import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/admin-auth"
import { FileText, MessageSquare, Users, TrendingUp, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStats } from "./dashboard-stats"
import { RecentDocuments } from "./recent-documents"
import { RecentConversations } from "./recent-conversations"
import { QuickActions } from "./quick-actions"

/**
 * Dashboard overview page with statistics and quick actions
 * Aggregates data from DocumentService, ConversationHistoryService, and WidgetCustomizationService
 */
export default async function DashboardPage() {
  const tenantId = await getTenantId()
  
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your chatbot performance and quick access to management features.
        </p>
      </div>

      {/* Statistics Overview */}
      <DashboardStats tenantId={tenantId} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentDocuments tenantId={tenantId} />
        <RecentConversations tenantId={tenantId} />
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            System Status
          </CardTitle>
          <CardDescription>
            Your chatbot system is running correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Widget Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium">API Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium">Database Ready</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
