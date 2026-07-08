import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read env variables manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)\s*$/)
  if (match) {
    env[match[1]] = match[2].trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing connection to Supabase...')
console.log('Project URL:', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credentials missing from .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runCheck() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    if (error) {
      console.error('Database connection failed:', error.message)
      process.exit(1)
    }
    console.log('✅ Connection Successful!')
    console.log(`✅ Profiles table exists and contains ${data || 0} registered user profiles.`)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

runCheck()
