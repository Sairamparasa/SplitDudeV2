'use client'

import { Bell, Menu, Search, Copy, Check, ChevronRight } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LogoIcon from './logo-icon'

interface HeaderProps {
  onToggleSidebar: () => void
  onSearchClick?: () => void
}

export default function Header({ onToggleSidebar, onSearchClick }: HeaderProps) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<{ full_name: string; unique_code: string; avatar_url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function getProfileAndNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, unique_code, avatar_url')
          .eq('id', user.id)
          .single()
        if (profileData) {
          setProfile({
            full_name: profileData.full_name || 'Alex Morgan',
            unique_code: profileData.unique_code || 'SPD7H4K2M',
            avatar_url: profileData.avatar_url || 'https://i.pravatar.cc/150?img=11',
          })
        }

        // Fetch Unread Notification Count
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        if (!error && count !== null) {
          setUnreadCount(count)
        }
      }
    }
    getProfileAndNotifications()
  }, [supabase])

  const copyCode = async () => {
    if (!profile?.unique_code) return
    try {
      await navigator.clipboard.writeText(profile.unique_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Generate breadcrumbs from current path
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return [{ label: 'SplitDude', href: '/dashboard' }]
    
    return segments.map((seg, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      let label = seg.charAt(0).toUpperCase() + seg.slice(1)
      
      // Override specific segment names for beauty
      if (label === 'Dashboard') label = 'Overview'
      if (label.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        label = 'Details' // simplify UUID parameters
      }
      return { label, href }
    })
  }, [pathname])

  return (
    <header className="glass-card mb-6 p-4 flex items-center justify-between text-white border border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
      {/* Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-white/70 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold tracking-wide text-white/40">
          <Link href="/dashboard" className="hover:text-brand-accent transition-colors flex items-center gap-1">
            <LogoIcon className="w-3.5 h-3.5" />
            <span>SplitDude</span>
          </Link>
          {breadcrumbs.map((bc, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              <Link
                href={bc.href}
                className={index === breadcrumbs.length - 1 ? "text-white/80 font-bold" : "hover:text-brand-accent transition-colors"}
              >
                {bc.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      {/* Universal Search trigger - acts like command palette shortcut pill */}
      <div 
        onClick={onSearchClick}
        className="hidden md:flex items-center bg-white/3 border border-white/5 hover:border-white/12 rounded-xl px-4 py-2 w-80 cursor-pointer transition-all group select-none"
      >
        <Search className="w-4 h-4 text-white/35 mr-3 group-hover:text-white/60 transition-colors" />
        <span className="text-sm text-white/35 group-hover:text-white/60 transition-colors flex-1">
          Quick search...
        </span>
        <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[10px] text-white/45 font-mono shadow-sm">
          <span>Ctrl</span>
          <span>K</span>
        </div>
      </div>

      {/* Right Side Icons & Avatar */}
      <div className="flex items-center gap-4">
        {/* Notification Button */}
        <Link
          href="/notifications"
          className="relative p-2.5 text-white/60 hover:text-white transition-all bg-white/3 hover:bg-white/6 rounded-xl border border-white/5 hover:border-white/10 shadow-sm group"
        >
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-brand-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-brand-bg px-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              >
                {unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
          <Bell className="w-4.5 h-4.5 group-hover:animate-swing" />
        </Link>

        {/* User Block */}
        {profile && (
          <div className="flex items-center gap-3 pl-4 border-l border-white/5">
            <div className="text-right hidden sm:block">
              <Link href="/profile">
                <p className="text-sm font-semibold hover:text-brand-accent transition-colors leading-none">
                  {profile.full_name}
                </p>
              </Link>
              <div
                onClick={(e) => {
                  e.preventDefault()
                  copyCode()
                }}
                className="flex items-center justify-end gap-1 mt-1 cursor-pointer group"
                title="Copy unique code"
              >
                <span className="text-[10px] text-brand-accent/75 group-hover:text-brand-accent font-mono tracking-wider font-semibold transition-colors">
                  {profile.unique_code}
                </span>
                {copied ? (
                  <Check className="w-2.5 h-2.5 text-brand-success" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-white/30 group-hover:text-brand-accent transition-colors" />
                )}
              </div>
            </div>

            <Link href="/profile" className="relative group shrink-0">
              <div className="absolute inset-0 bg-brand-accent rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-brand-accent/50 group-hover:border-brand-accent transition-all object-cover relative z-10 shadow-sm"
              />
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
