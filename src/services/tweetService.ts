import { supabase } from '@/integrations/supabase/client';
import { Tweet, TweetWithAuthor } from '@/types/Tweet';

export async function createTweet(content: string, imageFile?: File): Promise<Tweet | null> {
  try {
    const user = supabase.auth.getUser();
    
    if (!(await user).data.user) {
      throw new Error('User must be logged in to create a tweet');
    }
    
    let imageUrl = null;
    
    // If image file is provided, upload it to storage
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${(await user).data.user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tweet-images')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('tweet-images')
        .getPublicUrl(filePath);
        
      imageUrl = data.publicUrl;
    }
    
    // Insert tweet into database
    const { data, error } = await supabase
      .from('tweets')
      .insert({
        content,
        author_id: (await user).data.user?.id,
        image_url: imageUrl
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating tweet:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Tweet creation failed:', error);
    return null;
  }
}

export async function getTweets(limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweets_with_authors', { 
        limit_count: limit, 
        offset_count: offset 
      });
      
    if (error) {
      console.error('Error fetching tweets:', error);
      throw error;
    }
    
    // Transform the data to match the TweetWithAuthor type
    const transformedData: TweetWithAuthor[] = data.map((item: any) => {
      // Support both naming conventions 
      // (direct fields and profile_ prefixed fields)
      return {
        id: item.id,
        content: item.content,
        author_id: item.author_id,
        created_at: item.created_at,
        likes_count: item.likes_count,
        retweets_count: item.retweets_count,
        replies_count: item.replies_count,
        is_retweet: item.is_retweet,
        original_tweet_id: item.original_tweet_id,
        image_url: item.image_url,
        // Keep profile_ prefixed fields for compatibility with the type
        profile_username: item.profile_username || item.username,
        profile_display_name: item.profile_display_name || item.display_name,
        profile_avatar_url: item.profile_avatar_url || item.avatar_url,
        profile_avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
        profile_avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain,
        // Create the author object from either naming convention
        author: {
          id: item.author_id,
          username: item.profile_username || item.username,
          display_name: item.profile_display_name || item.display_name,
          avatar_url: item.profile_avatar_url || item.avatar_url || '',
          avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
          avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain
        }
      };
    });
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return [];
  }
}

export async function getUserTweets(userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_tweets', { 
        user_id: userId,
        limit_count: limit, 
        offset_count: offset 
      });
      
    if (error) {
      console.error('Error fetching user tweets:', error);
      throw error;
    }
    
    // Transform the data to match the TweetWithAuthor type
    const transformedData: TweetWithAuthor[] = data.map((item: any) => {
      // Support both naming conventions
      return {
        id: item.id,
        content: item.content,
        author_id: item.author_id,
        created_at: item.created_at,
        likes_count: item.likes_count,
        retweets_count: item.retweets_count,
        replies_count: item.replies_count,
        is_retweet: item.is_retweet,
        original_tweet_id: item.original_tweet_id,
        image_url: item.image_url,
        // Keep profile_ prefixed fields for compatibility with the type
        profile_username: item.profile_username || item.username,
        profile_display_name: item.profile_display_name || item.display_name,
        profile_avatar_url: item.profile_avatar_url || item.avatar_url,
        profile_avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
        profile_avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain,
        // Create the author object from either naming convention
        author: {
          id: item.author_id,
          username: item.profile_username || item.username,
          display_name: item.profile_display_name || item.display_name,
          avatar_url: item.profile_avatar_url || item.avatar_url || '',
          avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
          avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain
        }
      };
    });
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch user tweets:', error);
    return [];
  }
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    const user = supabase.auth.getUser();
    
    if (!(await user).data.user) {
      throw new Error('User must be logged in to like a tweet');
    }
    
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: (await user).data.user?.id,
        tweet_id: tweetId
      });
      
    if (error) {
      // If error is because user already liked tweet
      if (error.code === '23505') {
        // Delete the like instead (unlike)
        const { error: unlikeError } = await supabase
          .from('likes')
          .delete()
          .match({ 
            user_id: (await user).data.user?.id,
            tweet_id: tweetId 
          });
          
        if (unlikeError) {
          console.error('Error unliking tweet:', unlikeError);
          return false;
        }
        return true;
      }
      
      console.error('Error liking tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Like action failed:', error);
    return false;
  }
}

export async function retweet(tweetId: string): Promise<boolean> {
  try {
    const user = supabase.auth.getUser();
    
    if (!(await user).data.user) {
      throw new Error('User must be logged in to retweet');
    }
    
    // First check if user already retweeted this tweet
    const { data: existingRetweet, error: checkError } = await supabase
      .from('retweets')
      .select()
      .match({ 
        user_id: (await user).data.user?.id,
        tweet_id: tweetId 
      });
      
    if (checkError) {
      console.error('Error checking retweet status:', checkError);
      return false;
    }
    
    // If user already retweeted, remove the retweet
    if (existingRetweet && existingRetweet.length > 0) {
      const { error: deleteError } = await supabase
        .from('retweets')
        .delete()
        .match({ 
          user_id: (await user).data.user?.id,
          tweet_id: tweetId 
        });
        
      if (deleteError) {
        console.error('Error removing retweet:', deleteError);
        return false;
      }
      
      return true;
    }
    
    // Otherwise create a new retweet
    const { error } = await supabase
      .from('retweets')
      .insert({
        user_id: (await user).data.user?.id,
        tweet_id: tweetId
      });
      
    if (error) {
      console.error('Error retweeting:', error);
      return false;
    }
    
    // Also create a tweet entry that is marked as a retweet
    const { error: tweetError } = await supabase
      .from('tweets')
      .insert({
        content: '',
        author_id: (await user).data.user?.id,
        is_retweet: true,
        original_tweet_id: tweetId
      });
      
    if (tweetError) {
      console.error('Error creating retweet tweet:', tweetError);
      // Try to rollback the retweet entry
      await supabase
        .from('retweets')
        .delete()
        .match({ 
          user_id: (await user).data.user?.id,
          tweet_id: tweetId 
        });
        
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Retweet action failed:', error);
    return false;
  }
}

export async function replyToTweet(tweetId: string, content: string): Promise<boolean> {
  try {
    const user = supabase.auth.getUser();
    
    if (!(await user).data.user) {
      throw new Error('User must be logged in to reply to a tweet');
    }
    
    const { error } = await supabase
      .from('replies')
      .insert({
        content,
        user_id: (await user).data.user?.id,
        tweet_id: tweetId
      });
      
    if (error) {
      console.error('Error replying to tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Reply action failed:', error);
    return false;
  }
}

export async function checkIfUserLikedTweet(tweetId: string): Promise<boolean> {
  try {
    const user = supabase.auth.getUser();
    
    if (!(await user).data.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select()
      .match({ 
        user_id: (await user).data.user?.id,
        tweet_id: tweetId 
      });
      
    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Check like status failed:', error);
    return false;
  }
}

export async function getTweetReplies(tweetId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('replies')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching tweet replies:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch tweet replies:', error);
    return [];
  }
}
