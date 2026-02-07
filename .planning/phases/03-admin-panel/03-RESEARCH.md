# Phase 3: Admin Panel + Completeness - Research

**Researched:** February 7, 2026
**Domain:** Next.js Admin Dashboard with Supabase Auth and Shadcn/ui
**Confidence:** HIGH
**Readiness:** yes

## Summary

This phase implements a self-service admin panel for businesses to manage their AI chatbot, including training data management, conversation oversight, widget customization, and embed code generation. The stack leverages Next.js 14 (App Router) with React 18, Shadcn/ui component library, and Supabase Auth for authentication. Key architectural patterns include server-side rendering for data fetching, React Hook Form with Zod for form validation, TanStack Table for data management, and Supabase SSR package for cookie-based authentication.

The admin panel follows established SaaS conventions: sidebar navigation, card-based layouts, and responsive design. Widget customization uses a live preview pattern with form state management. Conversation history implements threaded message views with search and date filtering via TanStack Table. Embed code generation dynamically builds script tags from tenant configuration stored in the database.

**Primary recommendation:** Use Shadcn/ui's Sidebar component for navigation, DataTable pattern with TanStack Table for documents/conversations, and React Hook Form + Zod for widget customization forms. Implement Supabase SSR with middleware for auth session management.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.2.x | Full-stack React framework | App Router, server actions, API routes |
| react | 18.3.x | UI library | Latest stable with concurrent features |
| @supabase/supabase-js | 2.45.x | Database client | Official Supabase client |
| @supabase/ssr | 0.5.x | SSR authentication | Cookie-based auth for Next.js |
| tailwindcss | 3.4.x | Utility CSS | Rapid styling, Shadcn/ui compatible |

### UI Components (Shadcn/ui)

| Component | Purpose | Notes |
|-----------|---------|-------|
| Sidebar | Main navigation | Collapsible, themeable, icon support |
| DataTable | Documents, Conversations | Built on TanStack Table |
| Dialog | Confirmations, forms | Accessible modal dialogs |
| Form | Widget settings | React Hook Form integration |
| Card | Layout containers | Dashboard widgets |
| Tabs | Settings sections | Widget customization tabs |
| Toast / Sonner | Notifications | Success/error feedback |
| Button, Input, Select | Form primitives | Consistent styling |

### Form & Data Management

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.20.x | Data table logic | Headless, sorting, filtering, pagination |
| react-hook-form | 7.53.x | Form state | Performance, validation integration |
| zod | 3.23.x | Schema validation | TypeScript-native, React Hook Form resolver |
| @hookform/resolvers | 3.9.x | RHF + Zod bridge | Form validation binding |
| lucide-react | 0.447.x | Icons | Shadcn/ui default icon set |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.6.x | Date formatting | Conversation timestamps |
| @tanstack/react-query | 5.56.x | Data fetching | Optional: client-side data management |
| sonner | 1.5.x | Toast notifications | Success/error messages |

### Installation

```bash
# Create Next.js project with TypeScript and Tailwind
npx create-next-app@latest admin-panel --typescript --tailwind --eslint --app

cd admin-panel

# Initialize Shadcn/ui
pnpm dlx shadcn@latest init

# Add required Shadcn components
pnpm dlx shadcn@latest add sidebar button card dialog form input select \
  table tabs toast dropdown-menu avatar badge separator sheet spinner

# Install additional dependencies
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-table \
  react-hook-form @hookform/resolvers zod lucide-react date-fns sonner
```

## Architecture Patterns

### Admin Panel Page Structure

```
app/
├── layout.tsx                 # Root layout (no sidebar)
├── page.tsx                   # Marketing/landing redirect
├── login/
│   └── page.tsx               # Auth login page
├── admin/
│   ├── layout.tsx             # Admin layout with SidebarProvider
│   ├── page.tsx               # Redirects to /admin/dashboard
│   ├── dashboard/
│   │   └── page.tsx           # Overview stats: docs, conversations, API usage
│   ├── sources/
│   │   ├── page.tsx           # Document list with DataTable (ADMIN-01)
│   │   ├── [id]/
│   │   │   └── page.tsx       # Document detail/chunks view
│   │   └── new/
│   │       └── page.tsx       # Add new document form
│   ├── conversations/
│   │   ├── page.tsx           # Conversation list (ADMIN-02)
│   │   └── [id]/
│   │       └── page.tsx       # Thread view with messages
│   ├── settings/
│   │   └── page.tsx           # Widget customization (ADMIN-03)
│   └── embed/
│       └── page.tsx           # Embed code + API keys (ADMIN-04)
├── api/                       # API Routes (if needed)
│   └── ...
└── lib/
    ├── supabase/
    │   ├── client.ts          # Browser client
    │   └── server.ts          # Server client
    └── utils.ts               # cn() utility
```

### Sidebar Navigation Pattern

```typescript
// components/app-sidebar.tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  Code2,
  LogOut
} from "lucide-react"

const navItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Sources", url: "/admin/sources", icon: FileText },
  { title: "Conversations", url: "/admin/conversations", icon: MessageSquare },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Embed Code", url: "/admin/embed", icon: Code2 },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <span className="font-semibold">AI Chatbot</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* User avatar + logout */}
      </SidebarFooter>
    </Sidebar>
  )
}
```

### Supabase Auth Pattern (SSR)

```typescript
// lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server Components / Actions)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - can't set cookies
          }
        },
      },
    }
  )
}

// middleware.ts (Auth session refresh)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated and accessing /admin
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### DataTable Pattern for Documents

```typescript
// app/admin/sources/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export type Document = {
  id: string
  title: string
  source_type: "pdf" | "url" | "text"
  chunk_count: number
  status: "processing" | "ready" | "failed"
  created_at: string
}

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
  },
  {
    accessorKey: "source_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("source_type")}</Badge>
    ),
  },
  {
    accessorKey: "chunk_count",
    header: "Chunks",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant={
            status === "ready" ? "default" :
            status === "processing" ? "secondary" : "destructive"
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => formatDistanceToNow(new Date(row.getValue("created_at")), { addSuffix: true }),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const document = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Chunks
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

### Widget Customization Form Pattern

```typescript
// app/admin/settings/widget-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const widgetSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  position: z.enum(["bottom-right", "bottom-left"]),
  welcomeMessage: z.string().min(1).max(200),
  buttonText: z.string().min(1).max(50),
  headerTitle: z.string().min(1).max(50),
})

type WidgetFormValues = z.infer<typeof widgetSchema>

interface WidgetFormProps {
  defaultValues: WidgetFormValues
  onSubmit: (values: WidgetFormValues) => Promise<void>
}

export function WidgetForm({ defaultValues, onSubmit }: WidgetFormProps) {
  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Color</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    {...field}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input {...field} placeholder="#3B82F6" />
                </div>
              </FormControl>
              <FormDescription>
                Used for buttons and accents in the widget.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Widget Position</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="welcomeMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Welcome Message</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Hi! How can I help you today?"
                  className="resize-none"
                />
              </FormControl>
              <FormDescription>
                First message shown when widget opens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}
```

### Live Preview Pattern

```typescript
// app/admin/settings/page.tsx
"use client"

import { useState } from "react"
import { WidgetForm } from "./widget-form"
import { WidgetPreview } from "./widget-preview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  const [previewValues, setPreviewValues] = useState({
    primaryColor: "#3B82F6",
    position: "bottom-right" as const,
    welcomeMessage: "Hi! How can I help you today?",
    buttonText: "Chat",
    headerTitle: "Support Chat",
  })

  const handleFormChange = (values: typeof previewValues) => {
    setPreviewValues(values)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Widget Customization</CardTitle>
        </CardHeader>
        <CardContent>
          <WidgetForm
            defaultValues={previewValues}
            onChange={handleFormChange}
            onSubmit={async (values) => {
              // Save to database
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="relative min-h-[400px] bg-gray-100 rounded-lg">
          <WidgetPreview config={previewValues} />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Embed Code Generation Pattern

```typescript
// app/admin/embed/embed-code.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface EmbedCodeProps {
  apiKey: string
  widgetUrl: string
  onRegenerateKey: () => Promise<void>
}

export function EmbedCode({ apiKey, widgetUrl, onRegenerateKey }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const embedScript = `<script
  src="${widgetUrl}/widget.js"
  data-api-key="${apiKey}"
  async
></script>`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(embedScript)
    setCopied(true)
    toast.success("Embed code copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await onRegenerateKey()
      toast.success("API key regenerated")
    } catch (error) {
      toast.error("Failed to regenerate key")
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep this key secret. Regenerating will invalidate the old key.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
            <code>{embedScript}</code>
          </pre>
          <Button onClick={copyToClipboard}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Add this script tag to your website's HTML, just before the closing &lt;/body&gt; tag.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Conversation Thread View Pattern

```typescript
// app/admin/conversations/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
  sources?: { url: string; title: string }[]
}

interface Conversation {
  id: string
  session_id: string
  messages: Message[]
  created_at: string
  metadata: {
    user_agent?: string
    referrer?: string
  }
}

export default async function ConversationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, messages(*)")
    .eq("id", params.id)
    .single()

  if (!conversation) {
    return <div>Conversation not found</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversation #{conversation.session_id.slice(0, 8)}</CardTitle>
            <Badge variant="outline">
              {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversation.messages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "assistant" ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.role === "assistant" ? "AI" : "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                      <ul className="text-xs space-y-1">
                        {message.sources.map((source, idx) => (
                          <li key={idx}>
                            <a href={source.url} className="underline">
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Real-time Conversation Updates (Optional)

```typescript
// hooks/use-conversations.ts
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useRealtimeConversations(tenantId: string) {
  const [conversations, setConversations] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (data) setConversations(data)
    }

    fetchConversations()

    // Subscribe to new conversations
    const channel: RealtimeChannel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          setConversations((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  return conversations
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Data table** | Custom table with sorting/filtering | TanStack Table + Shadcn DataTable | Pagination, sorting, filtering, column visibility out-of-box |
| **Form validation** | Manual validation logic | React Hook Form + Zod | Type-safe, performant, declarative |
| **Auth session management** | Custom cookie handling | @supabase/ssr | Handles refresh tokens, cookie security |
| **Toast notifications** | Custom toast system | Sonner | Accessible, animated, promise support |
| **Sidebar navigation** | Custom collapsible sidebar | Shadcn Sidebar | Keyboard shortcuts, theming, mobile support |
| **Color picker** | Custom color input | Native `<input type="color">` | Browser-native, no JS required |
| **Date formatting** | Manual date strings | date-fns | Locale-aware, tree-shakeable |

**Key insight:** Shadcn/ui components are copy-paste source code, not a locked dependency. Customize the source after adding, don't build from scratch.

## Common Pitfalls

### Pitfall 1: Using Client Components for Data Fetching

**What goes wrong:** Unnecessary client-side data fetching with loading states when server components can fetch data directly.

**Why it happens:** Habit from older React patterns (useEffect, useState for data).

**How to avoid:**
- Default to Server Components for data display
- Use `async function` in Server Components to fetch directly
- Only use Client Components (`"use client"`) for interactivity

**Warning signs:**
- `useEffect` for initial data load
- Loading spinners on every page navigation
- Duplicate API calls

### Pitfall 2: Not Protecting API Routes

**What goes wrong:** API routes accessible without authentication, allowing unauthorized data access.

**Why it happens:** Middleware only protects page routes by default.

**How to avoid:**
```typescript
// app/api/documents/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Proceed with authenticated request
  const { data } = await supabase.from("documents").select("*")
  return NextResponse.json(data)
}
```

**Warning signs:**
- API routes without auth checks
- Public endpoints returning tenant data

### Pitfall 3: Blocking UI During Form Submission

**What goes wrong:** Form freezes during submission, no feedback to user.

**Why it happens:** Not using React Hook Form's submission state.

**How to avoid:**
```typescript
const { formState: { isSubmitting } } = useForm()

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Saving..." : "Save"}
</Button>
```

**Warning signs:**
- Users clicking submit multiple times
- No loading indicators on forms
- Duplicate submissions

### Pitfall 4: Exposing Service Role Key

**What goes wrong:** Service role key exposed in client-side code, bypassing RLS.

**Why it happens:** Using wrong environment variable or client type.

**How to avoid:**
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side
- Service role key ONLY in server-side code
- Never prefix service role key with `NEXT_PUBLIC_`

**Warning signs:**
- `SUPABASE_SERVICE_ROLE_KEY` in client components
- RLS policies not being enforced
- Cross-tenant data leaks

### Pitfall 5: Not Using Optimistic Updates

**What goes wrong:** UI feels slow when deleting/updating items (waits for server response).

**Why it happens:** Only updating UI after server confirms.

**How to avoid:**
```typescript
// Optimistic delete example
const handleDelete = async (id: string) => {
  // Optimistically remove from UI
  setDocuments(prev => prev.filter(d => d.id !== id))

  try {
    await supabase.from("documents").delete().eq("id", id)
    toast.success("Document deleted")
  } catch (error) {
    // Revert on failure
    refetchDocuments()
    toast.error("Failed to delete")
  }
}
```

**Warning signs:**
- Slow-feeling interactions
- Loading spinners for simple operations
- UI lag on delete/update actions

## Implementation Approach

### Phase 3 Implementation Steps

```
Step 1: Project Setup & Auth
├── Create Next.js 14 project with TypeScript
├── Initialize Shadcn/ui
├── Configure Supabase client (client.ts, server.ts)
├── Implement middleware for auth session refresh
├── Create login/logout pages
└── Test auth flow end-to-end

Step 2: Admin Layout & Navigation
├── Create admin layout with SidebarProvider
├── Add AppSidebar component with nav items
├── Implement sidebar collapse/expand
├── Add user avatar to sidebar footer
├── Create breadcrumb component
└── Style header with SidebarTrigger

Step 3: Dashboard Page
├── Create dashboard page structure
├── Fetch aggregate stats (documents, conversations, API calls)
├── Add Card components for each stat
├── Implement basic charts if time permits
└── Add quick action buttons

Step 4: Documents Management (ADMIN-01)
├── Create documents page with DataTable
├── Define columns (title, type, status, chunks, date, actions)
├── Implement filtering by type and status
├── Add pagination controls
├── Create "Add Document" dialog/page
├── Implement delete with confirmation
└── Test document CRUD operations

Step 5: Conversations View (ADMIN-02)
├── Create conversations list with DataTable
├── Implement search by message content
├── Add date range filter
├── Create thread view page
├── Display messages in conversation
├── Show source citations
├── Optional: Add real-time updates

Step 6: Widget Settings (ADMIN-03)
├── Create settings page layout
├── Build WidgetForm with Zod schema
├── Implement color picker
├── Add position selector
├── Create welcome message textarea
├── Build live preview component
├── Connect form state to preview
├── Save settings to database

Step 7: Embed Code Generation (ADMIN-04)
├── Create embed page
├── Display API key with show/hide toggle
├── Implement regenerate key function
├── Generate embed code dynamically
├── Add copy-to-clipboard functionality
├── Display usage instructions
└── Test embed code in external page

Step 8: Polish & Testing
├── Add loading skeletons
├── Implement error boundaries
├── Add toast notifications throughout
├── Test responsive design (mobile)
├── Test RLS enforcement
└── Verify all auth flows
```

## Decisions

### Decision 1: Server Components vs Client Components

**Decision:** Default to Server Components, use Client Components only for interactivity.

**Rationale:**
- Server Components reduce client bundle size
- Data fetching happens on server (faster, no loading states)
- RLS is enforced server-side
- Client Components only needed for: forms, event handlers, real-time subscriptions

**Impact:** Pages load faster, less JavaScript shipped to client.

### Decision 2: TanStack Table vs Custom Table

**Decision:** Use TanStack Table with Shadcn DataTable pattern.

**Rationale:**
- Built-in sorting, filtering, pagination
- Headless (full styling control)
- TypeScript-native
- Active maintenance
- Shadcn provides ready-made integration

**Impact:** Complex data management handled by proven library.

### Decision 3: Form Validation Location

**Decision:** Client-side validation with Zod, server-side re-validation.

**Rationale:**
- Client-side: instant feedback, better UX
- Server-side: security (never trust client)
- Zod schemas can be shared between client and server

**Impact:** Fast feedback for users, secure data handling.

### Decision 4: Real-time Updates for Conversations

**Decision:** Optional feature, implement polling first.

**Rationale:**
- Supabase Realtime adds complexity
- Admin panel doesn't require instant updates
- Polling every 30 seconds is sufficient for monitoring
- Can add real-time as enhancement later

**Impact:** Simpler initial implementation, faster delivery.

### Decision 5: Widget Preview Implementation

**Decision:** Render preview in iframe with posted config.

**Rationale:**
- True isolation from admin panel styles
- Uses actual widget code for accuracy
- PostMessage API for config updates
- Matches production embedding behavior

**Impact:** WYSIWYG preview that matches real deployment.

## Database Schema (Reference from Phase 2)

```sql
-- Widget settings table (new for Phase 3)
CREATE TABLE widget_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#3B82F6',
    position TEXT DEFAULT 'bottom-right',
    welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
    button_text TEXT DEFAULT 'Chat',
    header_title TEXT DEFAULT 'Support Chat',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for widget_settings
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can manage own settings"
    ON widget_settings FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

-- API keys table (new for Phase 3)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- Store hashed, not plaintext
    prefix TEXT NOT NULL,   -- "ak_" + first 8 chars for display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- RLS for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can manage own API keys"
    ON api_keys FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

-- Conversations table (from Phase 2, may need updates)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Open Questions

### Question 1: Document Upload Flow

**What we know:** Users need to add training documents via admin panel.

**What's unclear:**
- Should we use drag-drop, file picker, or both?
- What's the maximum file size to accept?
- How to show progress for large files?

**Recommendation:** Start with file picker (simpler), add drag-drop as enhancement. Limit to 10MB per file initially. Use Supabase Storage for file uploads with progress tracking.

### Question 2: Conversation Search Implementation

**What we know:** Users want to search conversation history.

**What's unclear:**
- Full-text search vs simple LIKE query?
- Search messages or just conversation metadata?
- Need date range filtering?

**Recommendation:** Implement PostgreSQL full-text search on messages.content. Add date range filter. Consider message search returning conversation links.

### Question 3: Analytics Dashboard Scope

**What we know:** Dashboard should show overview stats.

**What's unclear:**
- What metrics are most valuable?
- Historical trends or just current counts?
- Charts or just numbers?

**Recommendation:** Start with simple counts (documents, conversations, messages this week). Add basic chart (conversations over time) if time permits. Defer advanced analytics to Phase 4.

### Question 4: API Key Security

**What we know:** API keys authenticate widget requests.

**What's unclear:**
- Store hashed or encrypted?
- How to display key on creation (only time plaintext is shown)?
- Rate limiting per key?

**Recommendation:** Hash keys with bcrypt. Show plaintext only on creation (never stored). Implement rate limiting at API level (Phase 4).

## Sources

### Primary (HIGH confidence)
- **Shadcn/ui Documentation:** https://ui.shadcn.com/docs - Component installation, DataTable pattern, Sidebar, Forms
- **Supabase SSR Guide:** https://supabase.com/docs/guides/auth/server-side/creating-a-client - Next.js authentication patterns
- **Next.js App Router:** https://nextjs.org/docs/app - Server Components, layouts, middleware
- **TanStack Table:** https://tanstack.com/table/v8/docs - Sorting, filtering, pagination API

### Secondary (MEDIUM confidence)
- **React Hook Form:** https://react-hook-form.com/docs - Form state management, validation
- **Zod:** https://zod.dev/ - Schema validation patterns
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime - Optional real-time patterns

### Tertiary (LOW confidence)
- Community patterns for admin dashboard layouts
- Color picker implementations

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All libraries verified with official docs
- Architecture: HIGH - Next.js App Router patterns well-documented
- UI Components: HIGH - Shadcn/ui provides copy-paste source
- Auth Flow: HIGH - Supabase SSR official guide followed
- Pitfalls: MEDIUM - Based on common Next.js patterns and experience

**Research date:** February 7, 2026
**Valid until:** August 2026 (Next.js stable, Shadcn actively maintained)
