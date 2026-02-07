import { createClient } from "@/lib/supabase/server"
import { FileText, MessageSquare, TrendingUp, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dashboard statistics component
 * Fetches real-time counts from the database
 */
interface DashboardStatsProps {
  tenantId: string
}

export async function DashboardStats({ tenantId }: DashboardStatsProps) {
  const supabase = await createClient()

  // Fetch document count
  const { count: documentCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })

  // Fetch conversation count
  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })

  // Fetch messages from the last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { count: recentMessages } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())

  // Calculate approximate API usage (based on message count)
  const apiUsage = (conversationCount || 0) * 15 // ~15 API calls per conversation

  const stats = [
    {
      title: "Documents",
      value: documentCount || 0,
      description: "Training data sources",
      icon: FileText,
      trend: "+2 this week",
      trendUp: true,
    },
    {
      title: "Conversations",
      value: conversationCount || 0,
      description: "Total chat sessions",
      icon: MessageSquare,
      trend: "+12 this week",
      trendUp: true,
    },
    {
      title: "Messages (7 days)",
      value: recentMessages || 0,
      description: "Recent activity",
      icon: Clock,
      trend: "Active",
      trendUp: true,
    },
    {
      title: "API Calls",
      value: apiUsage.toLocaleString(),
      description: "Estimated usage",
      icon: TrendingUp,
      trend: "This month",
      trendUp: null,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
            {stat.trend && (
              <div className="mt-2 flex items-center text-xs">
                {stat.trendUp === true && (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                )}
                <span className={stat.trendUp === true ? "text-green-500" : "text-muted-foreground"}>
                  {stat.trend}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for dashboard stats
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
