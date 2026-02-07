'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  Code,
  LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { createBrowserClient } from '@/lib/supabase/client'

// Simple sidebar data structure
const navItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Sources',
    href: '/admin/sources',
    icon: FileText,
  },
  {
    title: 'Conversations',
    href: '/admin/conversations',
    icon: MessageSquare,
  },
  {
    title: 'Widget Settings',
    href: '/admin/settings',
    icon: Settings,
  },
  {
    title: 'Embed Code',
    href: '/admin/embed',
    icon: Code,
  },
]

export function AppSidebar({ user }: { user: { email?: string | null } }) {
  const pathname = usePathname()
  const [loading, setLoading] = React.useState(false)
  const supabase = createBrowserClient()

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">Chatbot Admin</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{loading ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}