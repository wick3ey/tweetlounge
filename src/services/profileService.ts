
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  ethereum_address: string | null;
  solana_address: string | null;
  avatar_nft_id: string | null;
  avatar_nft_chain: string | null;
  followers_count: number;
  following_count: number;
};

export async function getProfileById(userId: string): Promise<Profile | null> {
  try {
    if (!userId) {
      console.error('[profileService] Invalid userId provided');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[profileService] Error fetching profile:', error);
      return null;
    }

    if (!data) {
      console.log('[profileService] No profile found for userId:', userId);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error('[profileService] Failed to fetch profile:', error);
    return null;
  }
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    if (!username) {
      console.error('[profileService] Invalid username provided');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('[profileService] Error fetching profile by username:', error);
      return null;
    }

    if (!data) {
      console.log('[profileService] No profile found for username:', username);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error('[profileService] Failed to fetch profile by username:', error);
    return null;
  }
}

export async function createDefaultProfileIfNeeded(userId: string): Promise<Profile | null> {
  try {
    if (!userId) {
      console.error('[profileService] Invalid userId provided');
      return null;
    }

    // First check if profile exists
    const existingProfile = await getProfileById(userId);
    if (existingProfile) {
      return existingProfile;
    }

    // Create default profile if it doesn't exist
    const defaultProfile = {
      id: userId,
      username: `user-${userId.substring(0, 6)}`,
      display_name: `User ${userId.substring(0, 6)}`,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (error) {
      console.error('[profileService] Error creating default profile:', error);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error('[profileService] Failed to create default profile:', error);
    return null;
  }
}

export async function getProfiles(userIds: string[]): Promise<Profile[]> {
  try {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    // Get unique user IDs only
    const uniqueUserIds = [...new Set(userIds)];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueUserIds);

    if (error) {
      console.error('[profileService] Error fetching profiles:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[profileService] No profiles found for provided userIds');
      return [];
    }

    return data as Profile[];
  } catch (error) {
    console.error('[profileService] Failed to fetch profiles:', error);
    return [];
  }
}
