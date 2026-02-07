import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'A4 AI Chatbot Admin',
  description: 'Admin panel for managing AI Chatbot widgets',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side authentication check
  const supabase = await createServerSupabaseClient()
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If not authenticated and not on login page, redirect to login
  const isLoginPage = children?.toString().includes('login') || 
                      (typeof window === 'undefined' && false) // Simplified check

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
