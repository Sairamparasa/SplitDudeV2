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
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google login.')
      setGoogleLoading(false)
    }
  }

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

          {/* Google Login Separator */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-white/25">Or</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm shadow-md"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

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
