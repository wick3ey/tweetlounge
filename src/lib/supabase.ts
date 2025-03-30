
import { createClient } from '@supabase/supabase-js';

// Default values are used only for development or if environment variables are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kasreuudfxznhzekybzg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthc3JldXVkZnh6bmh6ZWt5YnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMzA5ODYsImV4cCI6MjA1ODcwNjk4Nn0.cAS96CnDSBzQtmLgSh28Xg-SfRwKV242iRT1MhDGNVc';

// Check if we have the required configuration
if (supabaseUrl === 'https://your-project.supabase.co' || supabaseAnonKey === 'your-anon-key') {
  console.warn(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  updated_at: string | null;
  created_at: string;
  replies_sort_order: string | null;
  ethereum_address: string | null;
  solana_address: string | null;
  avatar_nft_id: string | null;
  avatar_nft_chain: string | null;
  followers_count: number;
  following_count: number;
};

export type ProfileUpdatePayload = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
