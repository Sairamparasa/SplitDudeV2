'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import LogoIcon from '@/components/layout/logo-icon'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Check if session exists (which happens if auto-confirm is enabled in Supabase)
      if (data.session) {
        router.push('/home')
        router.refresh()
      } else {
        setSuccess(true)
        setLoading(false)
      }
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

          <h2 className="text-xl font-semibold mb-6 text-center">Create Your Account</h2>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="p-4 rounded-xl bg-brand-success/20 border border-brand-success/30 text-brand-success text-sm">
                Registration successful! Please check your email for a confirmation link.
              </div>
              <Link
                href="/login"
                className="block w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 px-4 rounded-xl transition-all"
              >
                Go to Login
              </Link>
            </motion.div>
          ) : (
            <>
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

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="glass-input w-full pl-12"
                    />
                  </div>
                </div>

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
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input w-full pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="glass-input w-full pl-12"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:shadow-[0_0_30px_rgba(124,92,255,0.6)] transition-all flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-white/50">
                Already have an account?{' '}
                <Link href="/login" className="text-brand-accent hover:underline font-medium">
                  Log In
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
