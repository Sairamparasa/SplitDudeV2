import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { shouldMockSupabase } from './mock-client'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If in mock mode, bypass Supabase server creation
  if (shouldMockSupabase()) {
    const mockUserCookie = request.cookies.get('splitdude_session_user')
    const user = mockUserCookie ? { id: mockUserCookie.value, email: 'mock@splitdude.dev' } : null
    const path = request.nextUrl.pathname
    const isProtectedRoute =
      path.startsWith('/home') ||
      path.startsWith('/dashboard') ||
      path.startsWith('/groups') ||
      path.startsWith('/expenses') ||
      path.startsWith('/friends') ||
      path.startsWith('/notifications') ||
      path.startsWith('/profile') ||
      path.startsWith('/settings')

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const isAuthRoute =
      path === '/login' ||
      path === '/signup' ||
      path === '/forgot-password' ||
      path === '/'

    if (isAuthRoute && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // Refresh user session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtectedRoute =
    path.startsWith('/home') ||
    path.startsWith('/dashboard') ||
    path.startsWith('/groups') ||
    path.startsWith('/expenses') ||
    path.startsWith('/friends') ||
    path.startsWith('/notifications') ||
    path.startsWith('/profile') ||
    path.startsWith('/settings')

  // Redirect to login if user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  const isAuthRoute =
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path === '/'

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
