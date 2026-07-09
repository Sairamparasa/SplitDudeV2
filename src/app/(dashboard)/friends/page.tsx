'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, UserPlus, Search, Copy, Check, Loader2, AlertCircle, QrCode, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FriendsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [searchId, setSearchId] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)

  // 1. Fetch current user auth details
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      return profile
    },
  })

  // 2. Fetch friend list
  const { data: friendsList, isLoading: isFriendsLoading } = useQuery({
    queryKey: ['friends', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          user_id_1,
          user_id_2,
          profile1:profiles!friends_user_id_1_fkey(*),
          profile2:profiles!friends_user_id_2_fkey(*)
        `)
        .or(`user_id_1.eq.${currentUser!.id},user_id_2.eq.${currentUser!.id}`)

      if (error) throw error

      const mapped = data.map((friendship: any) => {
        const otherProfile = friendship.user_id_1 === currentUser!.id 
          ? friendship.profile2 
          : friendship.profile1
        return {
          friendshipId: friendship.id,
          profile: otherProfile,
        }
      })
      return mapped as any[]
    },
  })

  // 3. Fetch friend requests
  const { data: requestsList, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['friendRequests', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*),
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${currentUser!.id},receiver_id.eq.${currentUser!.id}`)
        .eq('status', 'pending')

      if (error) throw error
      return (data || []) as any[]
    },
  })

  // 4. Send Friend Request Mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (uniqueCode: string) => {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      if (mockActive) {
        const profiles = JSON.parse(localStorage.getItem('splitdude_profiles') || '[]')
        const target = profiles.find((p: any) => p.unique_code === uniqueCode.trim().toUpperCase())
        if (!target) throw new Error('User with this SplitDude ID not found')
        if (target.id === currentUser?.id) throw new Error('You cannot add yourself')
        
        const requests = JSON.parse(localStorage.getItem('splitdude_friend_requests') || '[]')
        const alreadyExists = requests.some((r: any) => 
          (r.sender_id === currentUser?.id && r.receiver_id === target.id) ||
          (r.sender_id === target.id && r.receiver_id === currentUser?.id)
        )
        if (alreadyExists) throw new Error('Friend request already sent/pending')
        
        requests.push({
          id: Math.random().toString(36).substring(2, 10),
          sender_id: currentUser!.id,
          receiver_id: target.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        localStorage.setItem('splitdude_friend_requests', JSON.stringify(requests))
        return { success: true }
      }

      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueCode }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send request')
      return result
    },
    onSuccess: () => {
      setSearchSuccess('Friend request sent successfully!')
      setSearchId('')
      setSearchError(null)
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      setTimeout(() => setSearchSuccess(null), 3000)
    },
    onError: (err: any) => {
      setSearchError(err.message)
      setSearchSuccess(null)
    },
  })

  // 5. Handle Action (Accept / Reject) Mutation
  const actionMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'accept' | 'reject' }) => {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      if (mockActive) {
        const requests = JSON.parse(localStorage.getItem('splitdude_friend_requests') || '[]')
        const reqIndex = requests.findIndex((r: any) => r.id === requestId)
        if (reqIndex === -1) throw new Error('Request not found')
        
        if (action === 'accept') {
          requests[reqIndex].status = 'accepted'
          const friends = JSON.parse(localStorage.getItem('splitdude_friends') || '[]')
          friends.push({
            id: Math.random().toString(36).substring(2, 10),
            user_id_1: requests[reqIndex].sender_id,
            user_id_2: requests[reqIndex].receiver_id,
            created_at: new Date().toISOString()
          })
          localStorage.setItem('splitdude_friends', JSON.stringify(friends))
        } else {
          requests.splice(reqIndex, 1)
        }
        localStorage.setItem('splitdude_friend_requests', JSON.stringify(requests))
        return { success: true }
      }

      const res = await fetch('/api/friends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update request')
      return result
    },
    onMutate: async ({ requestId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['friends'] })
      await queryClient.cancelQueries({ queryKey: ['friendRequests'] })

      const previousFriends = queryClient.getQueryData(['friends'])
      const previousRequests = queryClient.getQueryData(['friendRequests'])

      if (action === 'accept') {
        const requestList = previousRequests as any[] || []
        const acceptedRequest = requestList.find((r) => r.id === requestId)
        if (acceptedRequest) {
          // Extract sender profile details from the request payload
          const friendProfile = acceptedRequest.sender
          if (friendProfile) {
            queryClient.setQueryData(['friends'], (old: any) => {
              return [friendProfile, ...(old || [])]
            })
          }
        }
      }

      queryClient.setQueryData(['friendRequests'], (old: any) => {
        return (old || []).filter((r: any) => r.id !== requestId)
      })

      return { previousFriends, previousRequests }
    },
    onError: (err: any, variables, context: any) => {
      if (context) {
        queryClient.setQueryData(['friends'], context.previousFriends)
        queryClient.setQueryData(['friendRequests'], context.previousRequests)
      }
      alert(err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
    },
  })

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(code)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Segment incoming vs outgoing pending requests
  const inboundRequests = useMemo(() => {
    if (!requestsList || !currentUser) return []
    return requestsList.filter((r) => r.receiver_id === currentUser.id)
  }, [requestsList, currentUser])


  const isLoading = isFriendsLoading || isRequestsLoading

  return (
    <div className="space-y-6 text-white">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Friends Ledger</h2>
          <p className="text-xs text-white/45 mt-1">Connect with friends to split expenditures instantly.</p>
        </div>
        {currentUser?.unique_code && (
          <button
            onClick={() => setShowQrModal(true)}
            className="bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 py-3 px-5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
          >
            <QrCode className="w-4 h-4 text-brand-accent" />
            Show My ID QR
          </button>
        )}
      </div>

      {/* Main Grid: Send requests (left) & Friend List (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add Friend & Pending requests */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Friend Form */}
          <div className="glass-card p-6 border border-white/5">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-accent" />
              Add Friend
            </h3>
            <p className="text-xs text-white/40 mb-4">Enter a friend's SplitDude ID below.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (searchId.trim()) sendRequestMutation.mutate(searchId.trim())
              }}
              className="space-y-3"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-white/35 absolute left-4" />
                <input
                  type="text"
                  placeholder="SplitDude ID e.g. SPDXXXXXX"
                  required
                  value={searchId}
                  onChange={(e) => {
                    setSearchId(e.target.value)
                    setSearchError(null)
                  }}
                  className="glass-input pl-10 pr-4 py-3 text-xs font-semibold uppercase font-mono w-full"
                />
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/15 text-brand-danger text-[11px] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchSuccess && (
                <div className="p-3 rounded-xl bg-brand-success/10 border border-brand-success/15 text-brand-success text-[11px] font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{searchSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sendRequestMutation.isPending}
                className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
              >
                {sendRequestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Send Friend Request</span>
                )}
              </button>
            </form>
          </div>

          {/* Pending Inbound Requests */}
          <div className="glass-card p-6 border border-white/5">
            <h3 className="text-base font-bold mb-4">Pending Requests ({inboundRequests.length})</h3>

            {inboundRequests.length === 0 ? (
              <p className="text-xs text-white/35 text-center py-4 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                No pending requests.
              </p>
            ) : (
              <div className="space-y-3">
                {inboundRequests.map((req) => (
                  <div key={req.id} className="p-3 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={req.sender?.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full border border-white/5 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{req.sender?.full_name}</p>
                        <p className="text-[9px] text-brand-accent font-mono mt-0.5">{req.sender?.unique_code}</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => actionMutation.mutate({ requestId: req.id, action: 'accept' })}
                        className="px-2.5 py-1.5 bg-brand-success hover:bg-brand-success/90 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => actionMutation.mutate({ requestId: req.id, action: 'reject' })}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold border border-white/5 rounded-lg cursor-pointer transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Friend list */}
        <div className="lg:col-span-2 glass-card p-6 min-h-[400px] flex flex-col border border-white/5">
          <h3 className="text-lg font-bold mb-6">All Friends</h3>

          {isLoading ? (
            <div className="space-y-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-white/2 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl shimmer-bg shrink-0"></div>
                    <div className="space-y-2 w-1/3">
                      <div className="h-4 shimmer-bg rounded-lg"></div>
                      <div className="h-3 shimmer-bg rounded-lg w-2/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !friendsList || friendsList.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
              <div className="p-4 bg-white/3 border border-white/5 rounded-2xl mb-4">
                <UserCheck className="w-8 h-8 text-white/20" />
              </div>
              <p className="font-bold text-white/70 text-sm">No friends added yet</p>
              <p className="text-xs text-white/35 max-w-sm mt-1 mb-6 leading-relaxed">
                Connect with others by sharing your SplitDude ID or typing their unique ID in the sidebar input box.
              </p>
              {currentUser?.unique_code && (
                <button
                  onClick={() => copyCode(currentUser.unique_code)}
                  className="px-4 py-2.5 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent border border-brand-accent/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copiedId === currentUser.unique_code ? (
                    <>
                      <Check className="w-4 h-4 text-brand-success" />
                      <span>Copied ID!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy My ID ({currentUser.unique_code})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendsList.map((friend) => (
                <div key={friend.friendshipId} className="p-4 bg-white/2 hover:bg-white/4 border border-white/5 rounded-2xl flex items-center justify-between transition-all group">
                  <div className="flex items-center gap-3">
                    <img src={friend.profile.avatar_url} className="w-11 h-11 rounded-full object-cover border border-white/10" alt="Avatar" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold truncate text-white">{friend.profile.full_name}</h4>
                      <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{friend.profile.unique_code}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => copyCode(friend.profile.unique_code)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/55 hover:text-white rounded-lg border border-white/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Copy unique code"
                  >
                    {copiedId === friend.profile.unique_code ? (
                      <Check className="w-4 h-4 text-brand-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Pass Drawer Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card bg-[#0A0B14]/95 p-6 max-w-sm w-full relative text-center space-y-6 rounded-3xl border border-white/8 shadow-2xl"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold gradient-text">My SplitDude ID</h3>
              <p className="text-xs text-white/45">
                Let others scan or copy your unique identity code to add you instantly.
              </p>

              {/* Pass representation box */}
              <div className="bg-white/2 border border-white/5 rounded-2xl p-6 font-mono text-3xl font-extrabold tracking-widest text-brand-accent relative overflow-hidden group">
                {currentUser?.unique_code}
                <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <button
                    onClick={() => copyCode(currentUser?.unique_code || '')}
                    className="bg-brand-accent text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-md">
                {/* QR Code representation */}
                <div className="w-40 h-40 bg-gradient-to-tr from-brand-accent to-brand-secondary rounded-xl flex flex-col items-center justify-center text-white text-xs font-bold font-mono p-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/80">SplitDude Card</span>
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mt-3 shadow-lg border border-white/15">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => copyCode(currentUser?.unique_code || '')}
                className="w-full bg-brand-accent hover:bg-brand-accent/90 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
              >
                {copiedId === currentUser?.unique_code ? 'Copied ID Code!' : 'Copy Code ID'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
