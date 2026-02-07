import { FileText, MessageSquare, Settings, Code, Plus, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Quick actions component for dashboard
 * Provides easy access to main admin features
 */
export function QuickActions() {
  const actions = [
    {
      title: "Add Document",
      description: "Upload PDF, URL, or text content to train your chatbot",
      href: "/admin/sources",
      icon: Plus,
      color: "bg-blue-500",
    },
    {
      title: "View Analytics",
      description: "See conversation metrics and usage patterns",
      href: "/admin/conversations",
      icon: BarChart3,
      color: "bg-purple-500",
    },
    {
      title: "Customize Widget",
      description: "Change colors, position, and messages",
      href: "/admin/settings",
      icon: Settings,
      color: "bg-green-500",
    },
    {
      title: "Get Embed Code",
      description: "Generate installation script for your website",
      href: "/admin/embed",
      icon: Code,
      color: "bg-orange-500",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks and shortcuts for managing your chatbot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex flex-col items-center p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
            >
              <div className={`p-3 rounded-full ${action.color} bg-opacity-10 mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className={`h-6 w-6 ${action.color.replace('bg-', 'text-')}`} />
              </div>
              <h3 className="font-medium text-center mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground text-center">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
