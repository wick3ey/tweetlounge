
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdatePayload = Omit<Profile, 'id' | 'created_at'>;

type ProfileContextType = {
  profile: ProfileUpdatePayload | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<ProfileUpdatePayload>) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileUpdatePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user?.id) return;
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        setError(fetchError.message);
        return;
      }
      
      if (data) {
        const profileData: ProfileUpdatePayload = {
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
          updated_at: data.updated_at
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Profile loading error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<ProfileUpdatePayload>) => {
    try {
      setError(null);
      
      if (!user) return;
      
      const updatedProfile = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
      throw error;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user]);

  const value = {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
