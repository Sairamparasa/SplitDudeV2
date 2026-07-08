'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import LogoIcon from '@/components/layout/logo-icon'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push('/home')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 bg-brand-glass backdrop-blur-xl border border-brand-glassBorder rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] mb-3">
              <LogoIcon className="w-6 h-6" variant="white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/75">
              SplitDude
            </h1>
            <p className="text-white/60 text-sm mt-1">Premium Expense Sharing</p>
          </div>

          <h2 className="text-xl font-semibold mb-6 text-center">Welcome Back</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-brand-danger/20 border border-brand-danger/30 text-brand-danger flex items-start gap-3 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full pl-12"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-white/70">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-accent hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-12"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:shadow-[0_0_30px_rgba(124,92,255,0.6)] transition-all flex items-center justify-center gap-2 mt-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/50">
            Don't have an account?{' '}
            <Link href="/signup" className="text-brand-accent hover:underline font-medium">
              Sign Up
            </Link>
          </p>

          {typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url')) && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60 space-y-1">
              <p className="font-semibold text-brand-accent">💡 Sandbox Mock Mode Active</p>
              <p>Sign in using <span className="font-mono text-white/80">alex@splitdude.dev</span> (password: any)</p>
              <p>or register a new profile on the Sign Up tab.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
