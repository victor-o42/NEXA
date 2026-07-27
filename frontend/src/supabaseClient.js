import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ggzbqdxmeitcupgtheri.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnemJxZHhtZWl0Y3VwZ3RoZXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxMjQsImV4cCI6MjA5MzQyNjEyNH0.HW7L9kVIwWy2_4bsZ0-Lyuhr1EkAm2kcNpnHp87D8g8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
