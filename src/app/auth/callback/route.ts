import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // In OAuth sandbox, the session user cookie needs to be matched
      const { data: { user } } = await supabase.auth.getUser()
      
      const response = NextResponse.redirect(`${origin}${next}`)
      
      if (user) {
        // Set mock/real cookie fallback for middleware
        response.cookies.set('splitdude_session_user', user.id, {
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        })
      }
      
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=OAuth authentication failed`)
}
