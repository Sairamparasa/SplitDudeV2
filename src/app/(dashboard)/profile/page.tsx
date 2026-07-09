'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { User, Mail, Shield, Check, Copy, AlertCircle, Loader2, Award } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const aiAvatars = [
    { name: 'Adventurer Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
    { name: 'Adventurer Aneka', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
    { name: 'Robo Sofia', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sofia' },
    { name: 'Robo Jack', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jack' },
    { name: 'Persona Cleo', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Cleo' },
    { name: 'Persona Oliver', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Oliver' },
    { name: 'Pixel Mimi', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Mimi' },
    { name: 'Pixel Leo', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Leo' },
  ]

  // Fetch profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
  })

  // Set initial state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const copyCode = async () => {
    if (!profile?.unique_code) return
    try {
      await navigator.clipboard.writeText(profile.unique_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setUpdating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      setSuccess(true)
      refetch()
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.')
    } finally {
      setUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-white">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Account Profile</h2>
        <p className="text-white/45 text-xs mt-1">Manage user identity parameters, unique codes, and avatars.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Hero identity card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden flex flex-col items-center text-center shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none"></div>
            
            {profile && (
              <>
                <div className="relative group">
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-24 h-24 rounded-3xl border-2 border-brand-accent/30 object-cover shadow-[0_4px_25px_rgba(139,92,246,0.2)]"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-brand-accent text-white p-1.5 rounded-xl border border-brand-bg shadow-md">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mt-4">{profile.full_name}</h3>
                <p className="text-xs text-white/45 font-mono mt-0.5 truncate w-full">{profile.email}</p>

                <div className="w-full h-px bg-white/5 my-4"></div>

                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-2">SplitDude ID Pass</span>
                
                <div
                  onClick={copyCode}
                  className="w-full bg-white/2 border border-white/5 hover:border-brand-accent/30 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all select-none group"
                >
                  <span className="text-brand-accent font-mono text-sm font-bold tracking-widest">{profile.unique_code}</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-brand-success shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/30 group-hover:text-brand-accent transition-colors shrink-0" />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Profile details form */}
        <div className="md:col-span-2">
          <div className="glass-card p-6 md:p-8 border border-white/5 shadow-lg">
            <h3 className="text-base font-bold mb-6">Profile Settings</h3>

            <form onSubmit={handleUpdate} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/15 text-brand-danger flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-brand-success/10 border border-brand-success/15 text-brand-success flex items-center gap-2 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="glass-input w-full pl-11 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* AI Avatar Selector Grid */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Select AI Avatar</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-white/3 border border-white/5 rounded-2xl">
                    {aiAvatars.map((av) => {
                      const isSelected = avatarUrl === av.url
                      return (
                        <motion.button
                          key={av.name}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAvatarUrl(av.url)}
                          className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 bg-white/5 cursor-pointer ${
                            isSelected
                              ? 'border-brand-accent shadow-[0_0_15px_rgba(139,92,246,0.3)] bg-brand-accent/15'
                              : 'border-transparent hover:border-white/20'
                          }`}
                          title={av.name}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-contain" />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Or Custom Avatar URL</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <Shield className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="glass-input w-full pl-11 text-xs font-semibold font-mono"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="glass-input w-full pl-11 text-xs font-semibold bg-white/3 opacity-40 cursor-not-allowed border-white/5"
                    title="Email address cannot be changed."
                  />
                </div>
                <p className="text-[10px] text-white/35 mt-1.5">Email address updates require admin operations.</p>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer mt-6"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Save Profile Settings</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
