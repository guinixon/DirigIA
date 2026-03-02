import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = "https://wltxeeovuxqbnltcgivz.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdHhlZW92dXhxYm5sdGNnaXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTc0NzQsImV4cCI6MjA4NzE3MzQ3NH0.YI8Z3SG89zSrxfQAP_kWlrs83e4FZ_reCg7rplVgGoc"

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: "pkce",               // 🔥 ESSENCIAL
      detectSessionInUrl: true,       // 🔥 ESSENCIAL
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)