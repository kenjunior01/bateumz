// Supabase client with fallback defaults for deployment platforms
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback values ensure the app builds and runs even when env vars are missing
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ngxrdpplyghlugoowjqj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5neHJkcHBseWdobHVnb293anFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTI0NjgsImV4cCI6MjA5MDY4ODQ2OH0.hcUunPyx-LjJqNwokWpuJVzeDq-ntPC2zf-NinBl39w";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
