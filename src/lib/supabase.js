import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zosbpstvgcbduszrvwdg.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvc2Jwc3R2Z2NiZHVzenJ2d2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTIxMTksImV4cCI6MjA5MjA4ODExOX0.cFG8qoDatjG3AlRIqyAOHi5uSkWHuqHKHzXO8VAFa2A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
