import { createBrowserClient } from '@supabase/ssr'
import { MockSupabaseClient, shouldMockSupabase } from './mock-client'

export function createClient() {
  if (shouldMockSupabase()) {
    return new MockSupabaseClient() as any
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
