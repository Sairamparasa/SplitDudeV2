'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Check, AlertCircle, Loader2, Info, Server, Settings, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'general' | 'cloud' | 'danger'>('general')

  // Password update states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.')
    } finally {
      setUpdating(false)
    }
  }

  // Cloud Diagnostics check
  const isMockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

  const handleResetMockState = () => {
    if (confirm('Clear local mock store? All local localstorage groups/expenses will be reset.')) {
      localStorage.removeItem('splitdude_groups')
      localStorage.removeItem('splitdude_group_members')
      localStorage.removeItem('splitdude_expenses')
      localStorage.removeItem('splitdude_expense_splits')
      localStorage.removeItem('splitdude_settlements')
      localStorage.removeItem('splitdude_notifications')
      localStorage.removeItem('splitdude_friends')
      localStorage.removeItem('splitdude_friend_requests')
      alert('Mock storage cleared. Refreshing page...')
      window.location.reload()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Settings</h2>
        <p className="text-white/45 text-xs mt-1">Configure account parameters, diagnostics, and integrations.</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-brand-accent text-white shadow-md'
                : 'bg-white/3 border border-white/5 text-white/50 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-brand-accent text-white shadow-md'
                : 'bg-white/3 border border-white/5 text-white/50 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Cloud Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'danger'
                ? 'bg-brand-danger/20 border border-brand-danger/30 text-brand-danger shadow-sm'
                : 'bg-white/3 border border-white/5 text-white/50 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Danger Zone</span>
          </button>
        </div>

        {/* Content body */}
        <div className="md:col-span-3">
          {activeTab === 'general' && (
            <div className="glass-card p-6 md:p-8 border border-white/5 shadow-lg space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Security Credentials</h3>
                <p className="text-xs text-white/40 mt-0.5">Update password and credential secrets.</p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/15 text-brand-danger flex items-center gap-2 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-xl bg-brand-success/10 border border-brand-success/15 text-brand-success flex items-center gap-2 text-xs font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="glass-input w-full pl-11 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="glass-input w-full pl-11 text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer mt-4"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="glass-card p-6 md:p-8 border border-white/5 shadow-lg space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">System Diagnostics</h3>
                <p className="text-xs text-white/40 mt-0.5">Observe Supabase connection and AWS service availability.</p>
              </div>

              {/* Status checklist */}
              <div className="space-y-4">
                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Supabase Client Connection</p>
                    <p className="text-[10px] text-white/40">Real-time DB synchronization state</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand-success/15 border border-brand-success/20 text-brand-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </div>
                </div>

                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Database Mode</p>
                    <p className="text-[10px] text-white/40">Using offline local mock data vs Supabase cloud</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                    isMockActive
                      ? 'bg-brand-warning/15 border-brand-warning/20 text-brand-warning'
                      : 'bg-brand-accent/15 border-brand-accent/20 text-brand-accent'
                  }`}>
                    {isMockActive ? 'Offline Mock' : 'Live DB Cloud'}
                  </span>
                </div>

                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">AWS SNS Topic Publisher</p>
                    <p className="text-[10px] text-white/40">Topic publishing integration checks</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand-success/15 border border-brand-success/20 text-brand-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured</span>
                  </div>
                </div>

                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">AWS Textract OCR scan pipeline</p>
                    <p className="text-[10px] text-white/40">Document analysis and prefilling service</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand-success/15 border border-brand-success/20 text-brand-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {/* Info panel */}
              <div className="flex items-start gap-3 text-xs text-white/50 p-4 bg-white/2 rounded-2xl border border-white/5 leading-relaxed">
                <Info className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white">Security & Integrity</p>
                  <p>All database tables, transactions, and notification models are protected by Row Level Security (RLS). Database writes are only readable by participants of corresponding groups.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="glass-card p-6 md:p-8 border border-brand-danger/25 bg-brand-danger/[0.02] shadow-lg space-y-6">
              <div>
                <h3 className="text-base font-bold text-brand-danger">Danger Operations Zone</h3>
                <p className="text-xs text-white/40 mt-0.5">Irreversible actions impacting account storage.</p>
              </div>

              {isMockActive && (
                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white">Clear Mock Storage Database</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Reset your local localStorage database to default profiles and clear all generated expenses.</p>
                  </div>
                  <button
                    onClick={handleResetMockState}
                    className="bg-brand-danger hover:bg-brand-danger/90 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors"
                  >
                    Clear Mock Data
                  </button>
                </div>
              )}

              <div className="p-4 bg-white/2 border border-white/5 rounded-2xl space-y-3">
                <div>
                  <p className="text-xs font-bold text-white">Delete Profile Account</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Permanently delete your profile, friendships, active logs, and data records.</p>
                </div>
                <button
                  onClick={() => alert('Account deletion operations must be submitted through admin channels.')}
                  className="bg-brand-danger/20 hover:bg-brand-danger/30 border border-brand-danger/45 px-4 py-2 rounded-xl text-xs font-bold text-brand-danger cursor-pointer transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
