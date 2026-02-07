import * as React from 'react'

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-gray-200">{children}</div>
}