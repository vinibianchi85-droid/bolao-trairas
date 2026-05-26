import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fgkmjirqgsfmdnmquhby.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZna21qaXJxZ3NmbWRubXF1aGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDU0NDIsImV4cCI6MjA5NTM4MTQ0Mn0.YpOwcRTKB2NbKcwl8xjXtCsSAJzArFh2RkjVfMh5eb4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const LOCK_AT = new Date('2026-06-10T23:59:59-03:00')
