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

// Type for profile data to handle safely
interface FollowerProfile {
  id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  is_following?: boolean;
}

// Get a user's followers
export async function getFollowers(userId: string): Promise<any[]> {
  try {
    // Get the current user's ID to check who the user is following
    const { data: currentUserData } = await supabase.auth.getUser();
    const currentUser = currentUserData?.user;
    
    // Fetch followers directly with joined profile information
    const { data: followersData, error: followersError } = await supabase
      .from('followers')
      .select('follower_id, profiles:follower_id(id, username, display_name, avatar_url)')
      .eq('following_id', userId);
      
    if (followersError) {
      console.error('Error fetching followers:', followersError);
      return [];
    }
    
    // Transform data to match expected format, with safe property access
    const followers = followersData
      .map(follower => {
        // Check if profiles exists and has the expected structure
        const profile = follower.profiles as FollowerProfile | null;
        
        if (!profile) {
          return null;
        }
        
        return {
          id: profile.id || '',
          username: profile.username || '',
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url || null,
          is_following: false // We'll update this below
        };
      })
      .filter(Boolean) as any[]; // Remove null entries
    
    // Check which of these followers the current user is following back
    if (currentUser) {
      const followIds = followers
        .map(f => f.id)
        .filter(id => id && id.length > 0); // Filter out empty IDs
      
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
    
    // Fetch following directly with joined profile information
    const { data: followingData, error: followingError } = await supabase
      .from('followers')
      .select('following_id, profiles:following_id(id, username, display_name, avatar_url)')
      .eq('follower_id', userId);
      
    if (followingError) {
      console.error('Error fetching following:', followingError);
      return [];
    }
    
    // Transform data to match expected format, with safe property access
    const following = followingData
      .map(follow => {
        // Check if profiles exists and has the expected structure
        const profile = follow.profiles as FollowerProfile | null;
        
        if (!profile) {
          return null;
        }
        
        return {
          id: profile.id || '',
          username: profile.username || '',
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url || null,
          is_following: false // We'll update this below
        };
      })
      .filter(Boolean) as any[]; // Remove null entries
    
    // Check which of these users the current user is following
    if (currentUser && currentUser.id !== userId) {
      const followIds = following
        .map(f => f.id)
        .filter(id => id && id.length > 0); // Filter out empty IDs
      
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
    } else if (currentUser && currentUser.id === userId) {
      // If it's the current user's following list, mark all as following
      following.forEach(follow => {
        follow.is_following = true;
      });
    }
    
    return following;
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}
