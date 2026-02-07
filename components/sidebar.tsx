import * as React from 'react'
import { useSidebar } from './sidebar-provider'

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <>
        {/* Mobile sidebar overlay */}
        {openMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpenMobile(false)}
          />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
            openMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {children}
        </div>
      </>
    )
  }

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ${
        state === 'collapsed' ? '-translate-x-full' : 'translate-x-0'
      }`}
    >
      {children}
    </div>
  )
}