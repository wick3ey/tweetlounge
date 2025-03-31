
import { supabase } from '@/integrations/supabase/client';
import { Profile, ProfileUpdatePayload } from '@/lib/supabase';
import { createNotification, deleteNotification } from './notificationService';

// Get a profile by ID
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching profile by ID:', error);
      return null;
    }
    
    return data as Profile;
  } catch (error) {
    console.error('Failed to fetch profile by ID:', error);
    return null;
  }
}

// Get a profile by username
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
      
    if (error) {
      console.error('Error fetching profile by username:', error);
      return null;
    }
    
    return data as Profile;
  } catch (error) {
    console.error('Failed to fetch profile by username:', error);
    return null;
  }
}

// Update a profile
export async function updateProfile(id: string, profile: Partial<ProfileUpdatePayload>): Promise<Profile | null> {
  try {
    // Add updated_at field
    const updatedProfile = {
      ...profile,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updatedProfile)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }
    
    return data as Profile;
  } catch (error) {
    console.error('Failed to update profile:', error);
    return null;
  }
}

// Follow a user
export async function followUser(followingId: string): Promise<boolean> {
  try {
    // Get the current user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to follow another user');
    }
    
    const followerId = user.id;
    
    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    
    if (existingFollow) {
      // Already following, do nothing
      return true;
    }
    
    // Create the follow relationship
    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: followerId,
        following_id: followingId
      });
      
    if (error) {
      throw error;
    }
    
    // Manually update the followers/following counts since we can't use RPC
    // Update followers count
    const { data: profileToUpdate } = await supabase
      .from('profiles')
      .select('followers_count')
      .eq('id', followingId)
      .single();
      
    if (profileToUpdate) {
      const newCount = (profileToUpdate.followers_count || 0) + 1;
      await supabase
        .from('profiles')
        .update({ followers_count: newCount })
        .eq('id', followingId);
    }
    
    // Update following count
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('following_count')
      .eq('id', followerId)
      .single();
      
    if (currentUserProfile) {
      const newCount = (currentUserProfile.following_count || 0) + 1;
      await supabase
        .from('profiles')
        .update({ following_count: newCount })
        .eq('id', followerId);
    }
    
    // Create a notification for the follow action
    // Important: We're passing followerId as actorId, which must match the current user's ID
    // to satisfy the RLS policy requirement
    await createNotification(followingId, followerId, 'follow');
    
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

// Unfollow a user
export async function unfollowUser(followingId: string): Promise<boolean> {
  try {
    // Get the current user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to unfollow another user');
    }
    
    const followerId = user.id;
    
    // Delete the follow relationship
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
      
    if (error) {
      throw error;
    }
    
    // Manually update the followers/following counts since we can't use RPC
    // Update followers count
    const { data: profileToUpdate } = await supabase
      .from('profiles')
      .select('followers_count')
      .eq('id', followingId)
      .single();
      
    if (profileToUpdate && profileToUpdate.followers_count > 0) {
      const newCount = profileToUpdate.followers_count - 1;
      await supabase
        .from('profiles')
        .update({ followers_count: newCount })
        .eq('id', followingId);
    }
    
    // Update following count
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('following_count')
      .eq('id', followerId)
      .single();
      
    if (currentUserProfile && currentUserProfile.following_count > 0) {
      const newCount = currentUserProfile.following_count - 1;
      await supabase
        .from('profiles')
        .update({ following_count: newCount })
        .eq('id', followerId);
    }
    
    // Delete the notification for the unfollow action
    // Important: We're passing followerId as actorId, which must match the current user's ID
    // to satisfy the RLS policy requirement
    await deleteNotification(followingId, followerId, 'follow');
    
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

// Check if the current user is following another user
export async function isFollowing(followingId: string): Promise<boolean> {
  try {
    // Get the current user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    const followerId = user.id;
    
    // Check the follow relationship
    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    // Return a primitive boolean
    return data !== null;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Get a user's followers
export async function getFollowers(userId: string): Promise<any[]> {
  try {
    // Get the current user's ID to check who the user is following
    const { data: currentUserData } = await supabase.auth.getUser();
    const currentUser = currentUserData?.user;
    
    // First, get all follower IDs for the user
    const { data: followerRelations, error: followerError } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('following_id', userId);
      
    if (followerError) {
      console.error('Error fetching follower relations:', followerError);
      return [];
    }
    
    // If no followers found, return empty array
    if (!followerRelations || followerRelations.length === 0) {
      return [];
    }
    
    // Extract follower IDs
    const followerIds = followerRelations.map(relation => relation.follower_id);
    
    // Fetch the profile information for these followers
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followerIds);
      
    if (profilesError) {
      console.error('Error fetching follower profiles:', profilesError);
      return [];
    }
    
    // Transform data to match expected format
    const followers = profilesData.map(profile => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      is_following: false // We'll update this below
    }));
    
    // Check which of these followers the current user is following back
    if (currentUser && followers.length > 0) {
      const followIds = followers.map(f => f.id).filter(Boolean);
      
      if (followIds.length > 0) {
        const { data: followingData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', currentUser.id)
          .in('following_id', followIds);
          
        if (followingData) {
          const followingSet = new Set(followingData.map(f => f.following_id));
          
          followers.forEach(follower => {
            follower.is_following = followingSet.has(follower.id);
          });
        }
      }
    }
    
    return followers;
  } catch (error) {
    console.error('Error fetching followers:', error);
    return [];
  }
}

// Get who a user is following
export async function getFollowing(userId: string): Promise<any[]> {
  try {
    // Get the current user's ID to check who the user is following
    const { data: currentUserData } = await supabase.auth.getUser();
    const currentUser = currentUserData?.user;
    
    // First, get all following IDs for the user
    const { data: followingRelations, error: followingError } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);
      
    if (followingError) {
      console.error('Error fetching following relations:', followingError);
      return [];
    }
    
    // If not following anyone, return empty array
    if (!followingRelations || followingRelations.length === 0) {
      return [];
    }
    
    // Extract following IDs and make sure we're using each ID only once
    const followingIdsSet = new Set(followingRelations.map(relation => relation.following_id));
    const followingIds = Array.from(followingIdsSet);
    
    // Fetch the profile information for these followings
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followingIds);
      
    if (profilesError) {
      console.error('Error fetching following profiles:', profilesError);
      return [];
    }
    
    // Transform data to match expected format
    const following = profilesData.map(profile => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      is_following: currentUser?.id === userId ? true : false // If viewing own profile, already following all
    }));
    
    // Check which of these users the current user is following (if not viewing own profile)
    if (currentUser && currentUser.id !== userId && following.length > 0) {
      const followIds = following.map(f => f.id).filter(Boolean);
      
      if (followIds.length > 0) {
        const { data: followingCheckData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', currentUser.id)
          .in('following_id', followIds);
          
        if (followingCheckData) {
          const followingSet = new Set(followingCheckData.map(f => f.following_id));
          
          following.forEach(follow => {
            follow.is_following = followingSet.has(follow.id);
          });
        }
      }
    }
    
    return following;
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}

export const searchUsers = async (query: string, limit = 10): Promise<Profile[]> => {
  try {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    
    // Try the Supabase search_users RPC function first
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('search_users', { 
          search_term: searchTerm,
          limit_count: limit
        });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData as unknown as Profile[];
      }
    } catch (rpcErr) {
      console.log('RPC search failed, falling back to manual search:', rpcErr);
    }
    
    // If RPC fails or returns no results, use our enhanced search method
    // Get all profiles first (we'll filter client-side for better matching)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(100); // Get a decent number of profiles to search through
      
    if (error) {
      console.error('Error in fallback profile search:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Enhanced search algorithm - check multiple fields with weighted relevance
    const scoredResults = data.map(profile => {
      let score = 0;
      
      // Prepare the searchable fields, convert to lowercase for case-insensitive matching
      const username = (profile.username || '').toLowerCase();
      const displayName = (profile.display_name || '').toLowerCase();
      const bio = (profile.bio || '').toLowerCase();
      
      // Exact matches get highest score
      if (username === searchTerm) score += 100;
      if (displayName === searchTerm) score += 90;
      
      // Username match at start (e.g. "jo" matches "john")
      if (username.startsWith(searchTerm)) score += 80;
      
      // Display name match at start
      if (displayName.startsWith(searchTerm)) score += 70;
      
      // Username contains the term
      if (username.includes(searchTerm)) score += 60;
      
      // Display name contains the term
      if (displayName.includes(searchTerm)) score += 50;
      
      // Bio contains the term (lower weight)
      if (bio.includes(searchTerm)) score += 20;
      
      // Check for partial matches in username (eg. "joh" matches "john")
      if (searchTerm.length >= 2 && username.length >= 3) {
        const minMatchLength = Math.min(3, searchTerm.length);
        for (let i = 0; i <= username.length - minMatchLength; i++) {
          const segment = username.substring(i, i + searchTerm.length);
          if (segment.includes(searchTerm.substring(0, minMatchLength))) {
            score += 30;
            break;
          }
        }
      }
      
      // Check for partial matches in display name
      if (searchTerm.length >= 2 && displayName.length >= 3) {
        const minMatchLength = Math.min(3, searchTerm.length);
        for (let i = 0; i <= displayName.length - minMatchLength; i++) {
          const segment = displayName.substring(i, i + searchTerm.length);
          if (segment.includes(searchTerm.substring(0, minMatchLength))) {
            score += 25;
            break;
          }
        }
      }
      
      return { profile, score };
    });
    
    // Filter out zero scores and sort by score descending
    const filteredResults = scoredResults
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.profile);
    
    return filteredResults;
  } catch (err) {
    console.error('Error in searchUsers:', err);
    return [];
  }
};
