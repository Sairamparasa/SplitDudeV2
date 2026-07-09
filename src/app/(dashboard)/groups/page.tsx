'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Users, X, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Profile {
  id: string
  full_name: string
  unique_code: string
  avatar_url: string
}

export default function GroupsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupIcon, setGroupIcon] = useState('✈️')
  const [searchCode, setSearchCode] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState('')

  const emojis = ['✈️', '🏠', '🍔', '🚗', '🎓', '💼', '🍿', '🎮', '🏋️', '🛒', '🐾', '🎸']

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  // Fetch all groups user belongs to
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          icon,
          created_by,
          created_at,
          group_members (
            user_id,
            profiles (
              id,
              full_name,
              avatar_url,
              unique_code
            )
          )
        `)
      if (error) throw error
      return (data || []) as any[]
    },
  })

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return (groups || []).filter((g) => g.name.toLowerCase().includes(term))
  }, [groups, searchTerm])

  const handleSearchFriend = async () => {
    setSearchError(null)
    setSearchResult(null)
    const formattedCode = searchCode.trim().toUpperCase()

    if (!formattedCode.startsWith('SPD') || formattedCode.length !== 9) {
      setSearchError('Invalid code format. Example: SPD7H4K2M')
      return
    }

    setSearching(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('unique_code', formattedCode)
        .maybeSingle()

      if (error) {
        setSearchError('Error finding user.')
        return
      }

      if (!data) {
        setSearchError('User not found.')
        return
      }

      if (data.id === currentUser?.id) {
        setSearchError('You cannot add yourself.')
        return
      }

      if (selectedMembers.some((m) => m.id === data.id)) {
        setSearchError('User already added to list.')
        return
      }

      setSearchResult(data as Profile)
    } catch {
      setSearchError('An unexpected error occurred.')
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = (profile: Profile) => {
    setSelectedMembers([...selectedMembers, profile])
    setSearchResult(null)
    setSearchCode('')
  }

  const handleRemoveMember = (id: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== id))
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!groupName.trim()) {
      setFormError('Group name is required.')
      return
    }

    if (!currentUser) return

    setCreating(true)
    const previousGroups = queryClient.getQueryData(['groups', currentUser.id])

    // Optimistically update the UI list
    const tempId = `temp-group-id-${Date.now()}`
    const optimisticGroup = {
      id: tempId,
      name: groupName,
      description: groupDesc,
      icon: groupIcon,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      group_members: [
        { user_id: currentUser.id, profiles: { id: currentUser.id, full_name: 'You', avatar_url: null, unique_code: '' } },
        ...selectedMembers.map((m) => ({ user_id: m.id, profiles: m })),
      ],
    }

    queryClient.setQueryData(['groups', currentUser.id], (old: any) => {
      return [optimisticGroup, ...(old || [])]
    })

    // Close the modal early for instant responsiveness
    setModalOpen(false)

    try {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

      if (mockActive) {
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: groupName,
            description: groupDesc,
            icon: groupIcon,
            created_by: currentUser.id,
          })
          .select()
          .single()

        if (groupError) {
          throw groupError
        }

        const memberships = [
          { group_id: group.id, user_id: currentUser.id },
          ...selectedMembers.map((m) => ({ group_id: group.id, user_id: m.id })),
        ]

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(memberships)

        if (membersError) {
          throw membersError
        }

        fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupName,
            description: groupDesc,
            icon: groupIcon,
            memberIds: selectedMembers.map((m) => m.id),
          }),
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupName,
            description: groupDesc,
            icon: groupIcon,
            memberIds: selectedMembers.map((m) => m.id),
          }),
        })
        const result = await res.json()
        if (!res.ok) {
          throw new Error(result.error || 'Failed to create group')
        }
      }

      // Reset form fields
      setGroupName('')
      setGroupDesc('')
      setGroupIcon('✈️')
      setSelectedMembers([])
      
      // Invalidate query to fetch real database objects
      queryClient.invalidateQueries({ queryKey: ['groups', currentUser.id] })
    } catch (err: any) {
      // Rollback optimistic update
      queryClient.setQueryData(['groups', currentUser.id], previousGroups)
      // Open modal back and show the error message
      setModalOpen(true)
      setFormError(err?.message || 'An unexpected error occurred.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Groups</h2>
          <p className="text-xs text-white/45 mt-1">Split expenses easily across multiple custom circles.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-brand-accent hover:bg-brand-accent/90 py-3 px-5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Search Filter Toolbar */}
      <div className="flex items-center bg-white/3 border border-white/5 focus-within:border-brand-accent/50 rounded-2xl px-4 py-3 transition-all">
        <Search className="w-4 h-4 text-white/35 mr-3 shrink-0" />
        <input
          type="text"
          placeholder="Filter groups by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none outline-none text-xs w-full placeholder-white/30 text-white"
        />
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 shimmer-bg rounded-2xl"></div>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 glass-card max-w-xl mx-auto mt-6 border border-dashed border-white/10 rounded-3xl">
          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl mb-4">
            <Users className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Groups Found</h3>
          <p className="text-xs text-white/40 mb-6 max-w-sm">
            {searchTerm 
              ? 'No groups matched your search filter.' 
              : 'You are not a member of any groups yet. Create a group to start adding shared bills.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all text-xs cursor-pointer"
            >
              Create Your First Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const memberCount = group.group_members?.length || 0
            const avatars = (group.group_members || []).map((m: any) => m.profiles).filter(Boolean)
            
            return (
              <Link href={`/groups/${group.id}`} key={group.id} className="block group">
                <div className="glass-card hover:bg-white/[0.04] p-5 cursor-pointer h-full flex flex-col justify-between border border-white/5 hover:border-brand-accent/25 transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-xl shadow-lg shrink-0">
                      {group.icon || '✈️'}
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 border border-white/8 px-2.5 py-1 rounded-full text-white/60 group-hover:border-brand-accent/30 transition-colors uppercase tracking-wider">
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-accent transition-colors truncate">
                      {group.name}
                    </h3>
                    <p className="text-xs text-white/40 mt-1 line-clamp-2 min-h-[32px]">
                      {group.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Footer avatars & detail button */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.03]">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {avatars.slice(0, 4).map((member: Profile) => (
                        <img
                          key={member.id}
                          className="w-7 h-7 rounded-full border border-brand-bg object-cover"
                          src={member.avatar_url}
                          alt={member.full_name}
                        />
                      ))}
                      {avatars.length > 4 && (
                        <div className="w-7 h-7 rounded-full border border-brand-bg bg-white/10 flex items-center justify-center text-[10px] font-bold">
                          +{avatars.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="p-1 bg-white/5 border border-white/5 rounded-lg group-hover:bg-brand-accent/15 group-hover:border-brand-accent/30 transition-all shrink-0">
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-brand-accent transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card bg-[#0A0B14]/95 w-full max-w-md p-6 relative shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-white/8 rounded-3xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all border border-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-bold mb-4 gradient-text">Create Group</h2>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateGroup} className="space-y-4">
                {/* Icon Emojis grid */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Group Icon</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 pr-1 scrollbar-thin">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setGroupIcon(emoji)}
                        className={`text-xl p-2.5 rounded-xl border shrink-0 transition-all ${
                          groupIcon === emoji
                            ? 'bg-brand-accent/20 border-brand-accent text-white scale-105 shadow-sm'
                            : 'bg-white/3 border-white/5 text-white/60 hover:border-white/12'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Name */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa Trip, Flatmates"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="glass-input w-full text-xs font-semibold"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <textarea
                    placeholder="e.g. Shared expenses for travel or rent"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    rows={2}
                    className="glass-input w-full text-xs font-semibold resize-none"
                  />
                </div>

                {/* Add Members (Search by Split ID) */}
                <div className="border-t border-white/5 pt-4">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Add Members by ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SPD7H4K2M"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="glass-input flex-1 text-xs font-semibold uppercase font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSearchFriend}
                      disabled={searching}
                      className="px-4 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 rounded-xl text-xs font-bold text-white cursor-pointer transition-all"
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>

                  {searchError && (
                    <p className="text-[10px] text-brand-danger font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {searchError}
                    </p>
                  )}

                  {/* Search Result display */}
                  {searchResult && (
                    <div className="mt-3 p-3 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={searchResult.avatar_url}
                          alt={searchResult.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{searchResult.full_name}</p>
                          <p className="text-[9px] text-brand-accent font-mono mt-0.5">{searchResult.unique_code}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddMember(searchResult)}
                        className="px-2.5 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-[10px] font-bold rounded-lg transition-all"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Added list */}
                  {selectedMembers.length > 0 && (
                    <div className="mt-4">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">
                        Added Members ({selectedMembers.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full pl-2 pr-3 py-1 text-[10px] font-semibold"
                          >
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span className="truncate max-w-[80px]">{member.full_name.split(' ')[0]}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-white/35 hover:text-brand-danger transition-colors ml-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all mt-6 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Group'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
