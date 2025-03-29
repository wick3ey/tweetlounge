
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
      
      console.log("Fetching profile for user ID:", user.id);
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        
        // If profile doesn't exist, create a new one for this user
        if (fetchError.code === 'PGRST116') {
          console.log("Profile not found, creating new profile for user:", user.id);
          await createNewProfile(user.id);
          return;
        }
        
        setError(fetchError.message);
        return;
      }
      
      if (data) {
        console.log("Profile found:", data);
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
      } else {
        // Handle case where data is null but no error
        console.log("No profile found but no error, creating new profile for user:", user.id);
        await createNewProfile(user.id);
      }
    } catch (error) {
      console.error('Profile loading error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewProfile = async (userId: string) => {
    try {
      // Extract display name from user email or metadata if available
      let displayName = '';
      let username = '';
      
      if (user?.email) {
        displayName = user.email.split('@')[0];
        username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
      }
      
      if (user?.user_metadata?.full_name) {
        displayName = user.user_metadata.full_name;
      } else if (user?.user_metadata?.name) {
        displayName = user.user_metadata.name;
      }
      
      const newProfile = {
        id: userId,
        username,
        display_name: displayName,
        bio: '',
        avatar_url: user?.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
        followers_count: 0,
        following_count: 0
      };
      
      console.log("Creating new profile:", newProfile);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile);
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
        setError(insertError.message);
        return;
      }
      
      setProfile({
        username,
        display_name: displayName,
        bio: '',
        avatar_url: user?.user_metadata?.avatar_url || null,
        cover_url: null,
        location: null,
        website: null,
        updated_at: new Date().toISOString(),
        ethereum_address: null,
        solana_address: null,
        avatar_nft_id: null,
        avatar_nft_chain: null,
        followers_count: 0,
        following_count: 0,
        replies_sort_order: 'newest_first'
      });
      
      console.log("New profile created successfully");
    } catch (error) {
      console.error('Error in createNewProfile:', error);
      setError(error.message);
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
      
      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
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
