import * as React from 'react'

interface SidebarMenuButtonProps {
  children: React.ReactNode
  isActive?: boolean
  asChild?: boolean
  className?: string
}

export function SidebarMenuButton({
  children,
  isActive,
  className = '',
}: SidebarMenuButtonProps) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      } ${className}`}
    >
      {children}
    </button>
  )
}