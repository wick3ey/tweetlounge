
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

type AuthContextType = {
  user: any | null;
  setUser: (user: any | null) => void;
  signUp: (email: string, password: string, metadata?: object) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // First set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      
      if (session?.user) {
        console.log('User authenticated in auth state change:', session.user.email);
        setUser(session.user);
      } else {
        console.log('No user in auth state change');
        setUser(null);
      }
      
      setLoading(false);
      
      // Show toasts for auth events
      if (event === 'SIGNED_IN') {
        toast({
          title: 'Välkommen tillbaka!',
          description: `Du har loggat in.`,
        });
      } else if (event === 'SIGNED_OUT') {
        toast({
          title: 'Utloggad',
          description: 'Du har loggat ut.',
        });
      } else if (event === 'USER_UPDATED') {
        toast({
          title: 'Profil uppdaterad',
          description: 'Din användarprofil har uppdaterats.',
        });
      }
    });

    // Then check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Initial session found:', session.user.email);
          setUser(session.user);
        } else {
          console.log('No initial session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, metadata?: object) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/home`
        }
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      
      // Improved error handling for username conflicts
      if (error.message && error.message.includes('profiles_username_unique')) {
        toast({
          title: 'Användarnamnet finns redan',
          description: 'Välj ett annat användarnamn.',
          variant: 'destructive',
        });
        return { error: { message: 'Användarnamnet är redan taget. Välj ett annat användarnamn.' } };
      }
      
      return { error };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Initiating Google sign-in, current origin:', window.location.origin);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
          queryParams: {
            prompt: 'select_account',  // Force Google to show account selector
          }
        }
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  };

  const value = {
    user,
    setUser,
    signUp,
    signInWithEmail,
    signOut,
    signInWithGoogle,
    resetPassword,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
