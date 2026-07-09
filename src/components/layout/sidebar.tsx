'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Receipt, Settings, LogOut, User, UserCheck, Bell, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import LogoIcon from './logo-icon'

interface SidebarProps {
  onCloseMobile?: () => void
}

export default function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<{ full_name: string; unique_code: string; avatar_url: string } | null>(null)

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, unique_code, avatar_url')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile({
            full_name: data.full_name || 'User',
            unique_code: data.unique_code || '',
            avatar_url: data.avatar_url || 'https://i.pravatar.cc/150?img=11',
          })
        }
      }
    }
    getProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Friends', href: '/friends', icon: UserCheck },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="glass-card h-full flex flex-col p-6 w-full text-white border border-white/5 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 relative z-10">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer"
        >
          <LogoIcon className="w-5 h-5" variant="white" />
        </motion.div>
        <div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
            SplitDude
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 relative z-10 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all relative ${
                isActive ? 'text-white font-semibold' : 'text-white/50 hover:text-white'
              }`}
            >
              {/* Sliding Pill Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 bg-gradient-to-r from-brand-accent/20 to-brand-secondary/5 border border-brand-accent/30 rounded-xl -z-10 shadow-[0_4px_20px_rgba(139,92,246,0.1)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-brand-accent' : 'text-white/35 group-hover:text-white/70'
              }`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="mt-auto space-y-2 pt-6 border-t border-white/5 relative z-10">
        {profile && (
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 rounded-2xl transition-all mb-4 group"
          >
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-white/10 group-hover:border-brand-accent transition-all object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate group-hover:text-brand-accent transition-colors">{profile.full_name}</p>
              <p className="text-[10px] text-white/30 font-mono truncate">{profile.unique_code}</p>
            </div>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 text-brand-danger/60 hover:text-brand-danger hover:bg-brand-danger/10 border border-transparent hover:border-brand-danger/20 rounded-xl font-semibold transition-all text-xs cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  )
}
