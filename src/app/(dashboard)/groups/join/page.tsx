'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

function JoinGroupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // TECHNICAL DEBT ROADMAP NOTE:
  // Currently, we use the cryptographically secure Group UUID as the invite link parameter.
  // In the future, to hide database IDs, we can transition to a dedicated `group_invites` table
  // with short tokens (e.g. 6-8 digit alphanumeric keys) that map to group UUIDs.
  // We can lookup the groupId by resolving the short token here:
  // const inviteToken = searchParams.get('token')
  // const groupId = inviteToken ? await resolveInviteToken(inviteToken) : searchParams.get('groupId')
  const groupId = searchParams.get('groupId')

  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!groupId) {
      setError('Invalid invite link. Missing Group ID parameter.')
      setLoading(false)
      return
    }

    const checkAndJoinGroup = async () => {
      try {
        // 1. Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          // If not authenticated, redirect to login page preserving the join URL
          const currentUrl = window.location.pathname + window.location.search
          router.push(`/login?next=${encodeURIComponent(currentUrl)}`)
          return
        }

        // 2. Try to join group using the put route
        const res = await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            userIdToAdd: user.id,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          // If user is already a member, we can proceed to redirect them directly
          if (result.error && result.error.includes('already a member')) {
            setSuccess(true)
            setTimeout(() => {
              router.push(`/groups/${groupId}`)
            }, 1000)
            return
          }
          throw new Error(result.error || 'Failed to join group')
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(`/groups/${groupId}`)
        }, 1500)
      } catch (err: any) {
        setError(err.message || 'An error occurred while joining the group.')
        setLoading(false)
      }
    }

    checkAndJoinGroup()
  }, [groupId, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg text-white">
      <div className="glass-card bg-brand-glass backdrop-blur-xl border border-brand-glassBorder p-8 rounded-3xl w-full max-w-md shadow-2xl flex flex-col items-center text-center">
        {loading && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-brand-accent animate-spin mx-auto" />
            <h2 className="text-xl font-bold tracking-tight">Joining Group...</h2>
            <p className="text-xs text-white/45">Verifying your invitation credentials.</p>
          </div>
        )}

        {error && (
          <div className="space-y-6 w-full">
            <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-2xl text-brand-danger flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            <Link
              href="/groups"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-2xl text-xs font-bold transition-all"
            >
              Back to Groups
            </Link>
          </div>
        )}

        {success && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-success/15 border border-brand-success/30 flex items-center justify-center mx-auto text-brand-success">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Successfully Joined!</h2>
            <p className="text-xs text-white/45">Redirecting you to your group expense ledger...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-white/40 bg-brand-bg">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    }>
      <JoinGroupForm />
    </Suspense>
  )
}
