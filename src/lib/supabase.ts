
import { createClient } from '@supabase/supabase-js';

// Using the same values as in the main Supabase client
const supabaseUrl = "https://kasreuudfxznhzekybzg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthc3JldXVkZnh6bmh6ZWt5YnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMzA5ODYsImV4cCI6MjA1ODcwNjk4Nn0.cAS96CnDSBzQtmLgSh28Xg-SfRwKV242iRT1MhDGNVc";

// Check if we have the required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase credentials. Please check your environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage
  }
});

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  cover_url: string | null;
  updated_at: string | null;
  created_at: string;
};

export type ProfileUpdatePayload = Omit<Profile, 'id' | 'created_at'>;
