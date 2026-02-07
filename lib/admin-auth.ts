import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type { Session, User } from '@supabase/supabase-js'

/**
 * Creates a Supabase SSR client for server-side operations
 */
async function createAdminSupabaseClient() {
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
            // Server Component handling
          }
        },
      },
    }
  )
}

/**
 * Gets the current session from Supabase
 * @returns The current session or null if not authenticated
 */
export async function getSession() {
  const supabase = await createAdminSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Gets the current user from the session
 * @returns The current user or null if not authenticated
 */
export async function getUser() {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Requires authentication and returns the user
 * Redirects to /login if not authenticated
 * @returns The authenticated user
 */
export async function requireAuth() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

/**
 * Signs out the current user and redirects to /login
 */
export async function signOut() {
  const supabase = await createAdminSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
