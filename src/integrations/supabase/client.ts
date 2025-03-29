
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kasreuudfxznhzekybzg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthc3JldXVkZnh6bmh6ZWt5YnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMzA5ODYsImV4cCI6MjA1ODcwNjk4Nn0.cAS96CnDSBzQtmLgSh28Xg-SfRwKV242iRT1MhDGNVc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage,
    // Enable anonymous access
    autoJoinProjectRef: true
  }
});
