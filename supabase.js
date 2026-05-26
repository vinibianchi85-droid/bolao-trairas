import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'COLE_AQUI_A_URL_DO_SUPABASE'
const supabaseAnonKey = 'COLE_AQUI_A_CHAVE_ANON_PUBLIC'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const LOCK_AT = new Date('2026-06-10T23:59:59-03:00')
