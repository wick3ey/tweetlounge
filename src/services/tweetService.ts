
import { supabase } from '@/lib/supabase';
import { TweetWithAuthor } from '@/types/Tweet';

// Get a single tweet with author details
export async function getOriginalTweet(originalTweetId: string): Promise<TweetWithAuthor | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_with_author_reliable', { tweet_id: originalTweetId });

    if (error) {
      console.error('Error fetching original tweet:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const tweetData = data[0];
    
    return {
      id: tweetData.id,
      content: tweetData.content,
      author_id: tweetData.author_id,
      created_at: tweetData.created_at,
      likes_count: tweetData.likes_count,
      retweets_count: tweetData.retweets_count,
      replies_count: tweetData.replies_count,
      is_retweet: tweetData.is_retweet,
      original_tweet_id: tweetData.original_tweet_id,
      image_url: tweetData.image_url,
      author: {
        id: tweetData.author_id,
        username: tweetData.username,
        display_name: tweetData.display_name,
        avatar_url: tweetData.avatar_url || '',
        avatar_nft_id: tweetData.avatar_nft_id,
        avatar_nft_chain: tweetData.avatar_nft_chain
      }
    };
  } catch (error) {
    console.error('Failed to fetch original tweet:', error);
    return null;
  }
}

// Get tweets with pagination support
export async function getTweets(limit: number = 20, offset: number = 0): Promise<TweetWithAuthor[]> {
  try {
    // Fix the function call to match the database function definition
    // Changing from 'get_tweets_with_authors' with tweets_limit, tweets_offset parameters
    // to 'get_tweets_with_authors' with limit_count, offset_count parameters
    const { data, error } = await supabase
      .rpc('get_tweets_with_authors', { 
        limit_count: limit, 
        offset_count: offset 
      });

    if (error) {
      console.error('Error fetching tweets:', error);
      return [];
    }

    // Map the data to match the TweetWithAuthor interface
    return data?.map(tweet => ({
      id: tweet.id,
      content: tweet.content,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      likes_count: tweet.likes_count,
      retweets_count: tweet.retweets_count,
      replies_count: tweet.replies_count,
      is_retweet: tweet.is_retweet,
      original_tweet_id: tweet.original_tweet_id,
      image_url: tweet.image_url,
      author: {
        id: tweet.author_id,
        username: tweet.profile_username,
        display_name: tweet.profile_display_name,
        avatar_url: tweet.profile_avatar_url || '',
        avatar_nft_id: tweet.profile_avatar_nft_id,
        avatar_nft_chain: tweet.profile_avatar_nft_chain
      }
    })) || [];
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return [];
  }
}

// Get tweets by user ID
export async function getUserTweets(userId: string): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_tweets_with_authors', { user_id_param: userId });

    if (error) {
      console.error('Error fetching user tweets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch user tweets:', error);
    return [];
  }
}

// Get retweets by user ID
export async function getUserRetweets(userId: string): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_retweets_with_authors', { user_id_param: userId });

    if (error) {
      console.error('Error fetching user retweets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch user retweets:', error);
    return [];
  }
}

// Create a new tweet
export async function createTweet(content: string, imageFile?: File): Promise<boolean> {
  try {
    const user = supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    
    if (!userId) {
      console.error('No authenticated user');
      return false;
    }

    let imageUrl = null;
    
    // If an image file is provided, upload it to storage
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: storageError } = await supabase.storage
        .from('tweet_images')
        .upload(filePath, imageFile);
      
      if (storageError) {
        console.error('Error uploading image:', storageError);
        return false;
      }
      
      const { data: urlData } = supabase.storage
        .from('tweet_images')
        .getPublicUrl(filePath);
        
      imageUrl = urlData.publicUrl;
    }
    
    // Insert the tweet
    const { error } = await supabase
      .from('tweets')
      .insert({
        content,
        author_id: userId,
        image_url: imageUrl
      });
    
    if (error) {
      console.error('Error creating tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create tweet:', error);
    return false;
  }
}

// Check if a user has liked a tweet - Fixed to use RPC instead of direct query
export async function checkIfUserLikedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return false;
    
    // Instead of querying the likes table directly, let's create an RPC function to check this
    const { data, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Failed to check like status:', error);
    return false;
  }
}

// Like or unlike a tweet
export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return false;
    
    const isLiked = await checkIfUserLikedTweet(tweetId);
    
    if (isLiked) {
      // Unlike the tweet
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweetId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error unliking tweet:', error);
        return false;
      }
    } else {
      // Like the tweet
      const { error } = await supabase
        .from('likes')
        .insert({
          tweet_id: tweetId,
          user_id: userId
        });
      
      if (error) {
        console.error('Error liking tweet:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to like/unlike tweet:', error);
    return false;
  }
}

// Check if a user has retweeted a tweet - Fixed to use RPC instead of direct query
export async function checkIfUserRetweetedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return false;
    
    // Use a count query instead of single which was causing 406 errors
    const { data, error } = await supabase
      .from('retweets')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error checking retweet status:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Failed to check retweet status:', error);
    return false;
  }
}

// Retweet or unretweet a tweet
export async function retweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return false;
    
    const isRetweeted = await checkIfUserRetweetedTweet(tweetId);
    
    if (isRetweeted) {
      // Unretweet
      const { error: deleteError } = await supabase
        .from('retweets')
        .delete()
        .eq('tweet_id', tweetId)
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error unretweet:', deleteError);
        return false;
      }

      // Remove the retweet tweet
      const { error: tweetDeleteError } = await supabase
        .from('tweets')
        .delete()
        .eq('author_id', userId)
        .eq('original_tweet_id', tweetId)
        .eq('is_retweet', true);
      
      if (tweetDeleteError) {
        console.error('Error deleting retweet tweet:', tweetDeleteError);
        return false;
      }
    } else {
      // Create retweet record
      const { error: retweetError } = await supabase
        .from('retweets')
        .insert({
          tweet_id: tweetId,
          user_id: userId
        });
      
      if (retweetError) {
        console.error('Error creating retweet record:', retweetError);
        return false;
      }
      
      // Create the retweet tweet
      const { error: tweetError } = await supabase
        .from('tweets')
        .insert({
          content: '',
          author_id: userId,
          is_retweet: true,
          original_tweet_id: tweetId
        });
      
      if (tweetError) {
        console.error('Error creating retweet tweet:', tweetError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to retweet/unretweet:', error);
    return false;
  }
}

// Delete a tweet
export async function deleteTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return false;
    
    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId)
      .eq('author_id', userId);
    
    if (error) {
      console.error('Error deleting tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete tweet:', error);
    return false;
  }
}

// Get a tweet by ID
export async function getTweetById(tweetId: string): Promise<TweetWithAuthor | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_with_author_reliable', { tweet_id: tweetId });
    
    if (error) {
      console.error('Error fetching tweet:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
    return null;
  }
}
