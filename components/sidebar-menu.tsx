import * as React from 'react'

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <ul className="px-2 space-y-1">{children}</ul>
}