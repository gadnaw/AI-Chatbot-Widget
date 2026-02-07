import * as React from 'react'

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-gray-200">{children}</div>
}