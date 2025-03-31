
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
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    
    // Use the optimized search_users RPC function that uses trigram similarity
    const { data, error } = await supabase
      .rpc('search_users', { 
        search_term: searchTerm,
        limit_count: limit
      });

    if (error) {
      console.error('Error searching users:', error);
      
      // Fallback to basic search
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`)
        .limit(limit);
        
      if (fallbackError) {
        console.error('Error in fallback user search:', fallbackError);
        return [];
      }
      
      return fallbackData as Profile[];
    }

    // Type cast the search results to Profile[] to ensure TypeScript compatibility
    // The search results have a similarity score but are missing some Profile properties
    return data as unknown as Profile[];
  } catch (err) {
    console.error('Error in searchUsers:', err);
    return [];
  }
};
