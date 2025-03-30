
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();

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
          cover_url: data.cover_url,
          location: data.location,
          website: data.website,
          updated_at: data.updated_at,
          ethereum_address: data.ethereum_address,
          solana_address: data.solana_address,
          avatar_nft_id: data.avatar_nft_id,
          avatar_nft_chain: data.avatar_nft_chain,
          followers_count: data.followers_count,
          following_count: data.following_count,
          replies_sort_order: data.replies_sort_order
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
      
      // Handle clearing NFT data when changing profile picture
      const updatedData = { ...updates };
      
      // If avatar_url is being changed and it's not from an NFT selection,
      // clear the NFT-related fields to remove verification badge
      if (updates.avatar_url && !updates.avatar_nft_id) {
        updatedData.avatar_nft_id = null;
        updatedData.avatar_nft_chain = null;
      }
      
      const updatedProfile = {
        ...updatedData,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user.id);
      
      if (updateError) {
        if (updateError.message && updateError.message.includes('profiles_username_unique')) {
          const errorMessage = 'This username is already taken. Please choose a different username.';
          toast({
            title: 'Username already taken',
            description: 'This username is already taken. Please choose a different username.',
            variant: 'destructive',
          });
          throw new Error(errorMessage);
        }
        throw updateError;
      }
      
      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
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
