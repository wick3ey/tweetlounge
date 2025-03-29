
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kasreuudfxznhzekybzg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthc3JldXVkZnh6bmh6ZWt5YnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMzA5ODYsImV4cCI6MjA1ODcwNjk4Nn0.cAS96CnDSBzQtmLgSh28Xg-SfRwKV242iRT1MhDGNVc";

// Create custom storage for handling localStorage in SSR environments
const customStorage = typeof window !== 'undefined' 
  ? {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Error accessing localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      }
    }
  : undefined;

// Initialize the Supabase client with anon permissions for public feeds
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    storage: customStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Add debug logging for session state
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth state changed: ${event}`, session ? 'User logged in' : 'No active session');
});

console.log('Supabase client initialized with public permission level');
