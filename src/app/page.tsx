'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Receipt, Shield, Sparkles } from 'lucide-react'
import LogoIcon from '@/components/layout/logo-icon'

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  }

  const features = [
    {
      icon: Users,
      title: 'Group Bill Sharing',
      desc: 'Create groups for roommates, trips, or events and track shared expenses effortlessly.',
    },
    {
      icon: Sparkles,
      title: 'Smart Settlement Math',
      desc: 'Greedy debt-simplification calculations tell you exactly who owes whom, reducing transaction counts.',
    },
    {
      icon: Receipt,
      title: 'Receipt Storage',
      desc: 'Upload images or PDFs of receipts directly to Supabase storage to back up expense logs.',
    },
    {
      icon: Shield,
      title: 'Private & Secure',
      desc: 'Protected by Supabase Row Level Security (RLS). Only members of your group can see expenses.',
    },
  ]

  return (
    <div className="min-h-screen text-white flex flex-col justify-between">
      {/* Header / Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <LogoIcon className="w-5 h-5" variant="white" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            SplitDude
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl text-sm font-semibold transition-all"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(124,92,255,0.3)] transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 flex-1 flex flex-col items-center justify-center text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-4 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-brand-accent mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Split bills beautifully</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/65 leading-tight">
            Premium Expense Sharing <br />
            For Modern Teams & Trips
          </h1>
          <p className="text-base md:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
            SplitDude simplifies shared bills. Set up groups, split equally, by exact amount, or percentages, upload receipts, and resolve debts using our advanced settlement math.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto"
        >
          <Link
            href="/signup"
            className="px-8 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-2xl shadow-[0_0_30px_rgba(124,92,255,0.4)] transition-all text-center"
          >
            Create Your Account
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-semibold transition-all text-center"
          >
            Launch Web App
          </Link>
        </motion.div>

        {/* Features list */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-16 w-full text-left"
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <motion.div
                variants={itemVariants}
                key={idx}
                className="glass-card p-6 bg-brand-glass border border-brand-glassBorder rounded-2xl transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-4 text-brand-accent">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{feat.desc}</p>
              </motion.div>
            )
          })}
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40 max-w-7xl mx-auto w-full px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>&copy; {new Date().getFullYear()} SplitDude. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  )
}
