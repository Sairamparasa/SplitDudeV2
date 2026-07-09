'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, RefreshCw, Trash2, UserPlus, Coffee } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // 1. Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      if (mockActive) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
      }
      const res = await fetch('/api/notifications')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to fetch')
      return result.data || []
    },
  })

  // 2. Mark Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async ({ notificationId, all }: { notificationId?: string; all?: boolean }) => {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      if (mockActive) {
        const list = JSON.parse(localStorage.getItem('splitdude_notifications') || '[]')
        const updated = list.map((item: any) => {
          if (all || item.id === notificationId) {
            return { ...item, is_read: true }
          }
          return item
        })
        localStorage.setItem('splitdude_notifications', JSON.stringify(updated))
        return { success: true }
      }
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, all }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // 3. Delete Notification Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ all: true })
  }

  const handleMarkSingleRead = (id: string) => {
    markReadMutation.mutate({ notificationId: id })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const unreadCount = useMemo(() => (notifications || []).filter((n: any) => !n.is_read).length, [notifications])

  return (
    <div className="space-y-6 text-white max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Notifications</h2>
          <p className="text-white/45 text-xs mt-1">Audit alert events, splits, friendships, and settlements.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent border border-brand-accent/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl transition-all cursor-pointer"
            title="Refresh inbox"
          >
            <RefreshCw className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 shimmer-bg rounded-2xl"></div>
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 glass-card border border-dashed border-white/10 rounded-3xl">
          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl mb-4">
            <Bell className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-bold mb-2">Inbox is Clear</h3>
          <p className="text-xs text-white/40 max-w-sm">
            All notifications have been read and cleared. We'll alert you here when new transactions trigger.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-white/5 pl-6 ml-4 space-y-6">
          <AnimatePresence initial={false}>
            {notifications.map((notif: any) => {
              const isFriendRequest = notif.type === 'friend_request'
              const isUnread = !notif.is_read

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="relative group"
                >
                  {/* Timeline Dot with Icon indicator */}
                  <span className={`absolute -left-[38px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-brand-bg shadow-sm ${
                    isUnread ? 'bg-brand-accent text-white' : 'bg-[#181926] text-white/40'
                  }`}>
                    {isFriendRequest ? (
                      <UserPlus className="w-3 h-3" />
                    ) : (
                      <Coffee className="w-3 h-3" />
                    )}
                  </span>

                  {/* Glassmorphic card body */}
                  <div className={`glass-card p-4 flex justify-between items-center border transition-all ${
                    isUnread 
                      ? 'bg-brand-accent/5 border-brand-accent/30 hover:border-brand-accent/50 shadow-md' 
                      : 'bg-white/2 border-white/5 hover:border-white/10'
                  }`}>
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white leading-none">{notif.title}</h4>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-white/50">{notif.content}</p>
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                        {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkSingleRead(notif.id)}
                          className="p-2 bg-white/5 hover:bg-brand-accent/15 text-white/50 hover:text-brand-accent rounded-lg border border-white/5 hover:border-brand-accent/20 transition-all cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-2 bg-white/3 hover:bg-brand-danger/10 text-white/30 hover:text-brand-danger rounded-lg border border-transparent hover:border-brand-danger/20 transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
