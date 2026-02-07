import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE THIS LINE
  // This refreshes the session if it exists and is expired
  await supabase.auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes: require authentication
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isApiAdminRoute = request.nextUrl.pathname.startsWith('/api/admin')

  // Public routes that don't require auth
  const isLoginRoute = request.nextUrl.pathname === '/login'
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth')
  const isStaticAsset =
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.') // files like favicon.ico

  // If accessing protected route without auth, redirect to login
  if ((isAdminRoute || isApiAdminRoute) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)

    if (isApiAdminRoute) {
      // For API routes, return 401 instead of redirect
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    return NextResponse.redirect(loginUrl)
  }

  // If already authenticated and trying to access login page, redirect to admin
  if (isLoginRoute && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/admin'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}