import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const LOCK_AT = new Date(import.meta.env.VITE_LOCK_AT || '2026-06-10T23:59:59-03:00')
