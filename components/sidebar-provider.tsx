import * as React from 'react'

const SidebarContext = React.createContext<{
  isMobile: boolean
  state: 'collapsed' | 'expanded'
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
} | null>(null)

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isMobile, setIsMobile] = React.useState(false)
  const [openMobile, setOpenMobile] = React.useState(false)
  const [state, setState] = React.useState<'collapsed' | 'expanded'>(
    defaultOpen ? 'expanded' : 'collapsed'
  )

  const toggleSidebar = React.useCallback(() => {
    setState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'))
  }, [])

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isMobile,
        state,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}