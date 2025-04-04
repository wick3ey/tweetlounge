
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Tweet, TweetWithAuthor, isValidTweet } from '@/types/Tweet';
import { processRetweetsInCollection, cacheTweets, getCachedTweets, getTweetCacheKey, CACHE_KEYS, processRetweetData } from '@/utils/tweetCacheService';
import { CACHE_DURATIONS } from '@/utils/cacheService';

// Create a new tweet
export const createTweet = async (content: string, imageFile?: File | null): Promise<Tweet | null> => {
  try {
    let imageUrl = null;
    
    // If an image is provided, upload it to storage
    if (imageFile) {
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('tweets')
        .upload(`images/${uuidv4()}`, imageFile);
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image');
      }
      
      // Get the public URL for the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('tweets')
        .getPublicUrl(uploadData.path);
      
      imageUrl = publicUrlData.publicUrl;
    }
    
    // Create the tweet
    const { data, error } = await supabase
      .from('tweets')
      .insert([
        { content, image_url: imageUrl }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating tweet:', error);
      throw new Error('Failed to create tweet');
    }

    // Broadcast the event that a new tweet was created
    try {
      const user = await supabase.auth.getUser();
      if (user?.data?.user) {
        await supabase.channel('custom-broadcast')
          .send({
            type: 'broadcast',
            event: 'tweet-created',
            payload: { userId: user.data.user.id }
          });
      }
    } catch (broadcastError) {
      console.error('Error broadcasting tweet creation:', broadcastError);
    }
    
    return data;
  } catch (error) {
    console.error('Error in createTweet:', error);
    return null;
  }
};

// Get tweets for the home feed
export const getTweets = async (limit = 10, offset = 0, forceRefresh = false): Promise<TweetWithAuthor[]> => {
  try {
    const cacheKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit, offset });
    
    // If not forcing a refresh, try to get from cache first
    if (!forceRefresh) {
      const cachedTweets = await getCachedTweets<TweetWithAuthor[]>(cacheKey);
      if (cachedTweets) {
        return cachedTweets;
      }
    }
    
    // If not in cache or forcing refresh, fetch fresh tweets
    const { data: rawTweets, error } = await supabase
      .rpc('get_tweets_with_authors_reliable', { limit_count: limit, offset_count: offset });
    
    if (error) {
      console.error('Error fetching tweets:', error);
      throw error;
    }
    
    // Process any retweets in the collection to fetch original author data
    const tweets = await processRetweetsInCollection(rawTweets);
    
    // Cache the result
    await cacheTweets(cacheKey, tweets, CACHE_DURATIONS.SHORT);
    
    return tweets;
  } catch (error) {
    console.error('Error in getTweets:', error);
    return [];
  }
};

// Get a single tweet by ID
export const getTweet = async (id: string): Promise<TweetWithAuthor | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_with_author_reliable', { tweet_id: id });
      
    if (error || !data || data.length === 0) {
      console.error('Error fetching tweet:', error);
      return null;
    }
    
    const tweetData = data[0];
    
    // Process the tweet if it's a retweet to get original author data
    let tweet: TweetWithAuthor = {
      id: tweetData.id,
      content: tweetData.content,
      author_id: tweetData.author_id,
      created_at: tweetData.created_at,
      likes_count: tweetData.likes_count || 0,
      retweets_count: tweetData.retweets_count || 0,
      replies_count: tweetData.replies_count || 0,
      is_retweet: tweetData.is_retweet || false,
      original_tweet_id: tweetData.original_tweet_id || null,
      image_url: tweetData.image_url || null,
      author: {
        id: tweetData.author_id,
        username: tweetData.username || 'user',
        display_name: tweetData.display_name || 'User',
        avatar_url: tweetData.avatar_url || null,
        bio: null,
        cover_url: null,
        location: null,
        website: null,
        updated_at: null,
        created_at: new Date().toISOString(),
        ethereum_address: null,
        solana_address: null,
        avatar_nft_id: tweetData.avatar_nft_id || null,
        avatar_nft_chain: tweetData.avatar_nft_chain || null,
        followers_count: 0,
        following_count: 0,
        replies_sort_order: null
      }
    };
    
    // If it's a retweet, get original tweet data
    if (tweet.is_retweet && tweet.original_tweet_id) {
      tweet = await processRetweetData(tweet);
    }
    
    return tweet;
  } catch (error) {
    console.error('Error in getTweet:', error);
    return null;
  }
};

// Get tweets by a specific user
export const getUserTweets = async (userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_tweets_reliable', { 
        user_id: userId,
        limit_count: limit,
        offset_count: offset
      });
      
    if (error) {
      console.error('Error fetching user tweets:', error);
      throw error;
    }
    
    // Process any retweets to get original author data
    const tweets = await processRetweetsInCollection(data);
    
    return tweets;
  } catch (error) {
    console.error('Error in getUserTweets:', error);
    return [];
  }
};

// Get user's retweets
export const getUserRetweets = async (userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_retweets_reliable', { 
        user_id: userId,
        limit_count: limit,
        offset_count: offset
      });
      
    if (error) {
      console.error('Error fetching user retweets:', error);
      throw error;
    }
    
    // Process retweets to get original author data
    const tweets = await processRetweetsInCollection(data);
    
    return tweets;
  } catch (error) {
    console.error('Error in getUserRetweets:', error);
    return [];
  }
};

// Delete a tweet
export const deleteTweet = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting tweet:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTweet:', error);
    return false;
  }
};

// Like/unlike a tweet
export const likeTweet = async (tweetId: string, unlike = false): Promise<boolean> => {
  try {
    // Get the current user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }
    
    if (unlike) {
      // Unlike the tweet
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.user.id, tweet_id: tweetId });
        
      if (error) {
        console.error('Error unliking tweet:', error);
        throw error;
      }
    } else {
      // Like the tweet
      const { error } = await supabase
        .from('likes')
        .insert([{ user_id: user.user.id, tweet_id: tweetId }]);
        
      if (error) {
        // If error is about unique constraint, the user already liked the tweet
        if (error.code === '23505') {
          console.warn('User already liked this tweet');
          return true;
        }
        
        console.error('Error liking tweet:', error);
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in likeTweet:', error);
    return false;
  }
};

// Check if the user has liked a tweet
export const checkIfUserLikedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    // Get the current user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return false;
    }
    
    // Check if the user has liked the tweet
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking if user liked tweet:', error);
      throw error;
    }
    
    return data !== null;
  } catch (error) {
    console.error('Error in checkIfUserLikedTweet:', error);
    return false;
  }
};

// Retweet/unretweet a tweet
export const retweet = async (tweetId: string, undo = false): Promise<boolean> => {
  try {
    // Get the current user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }
    
    // If we're undoing a retweet, we need to find and delete it
    if (undo) {
      // Find the retweet to delete
      const { data: retweets, error: findError } = await supabase
        .from('tweets')
        .select('id')
        .eq('author_id', user.user.id)
        .eq('is_retweet', true)
        .eq('original_tweet_id', tweetId);
        
      if (findError) {
        console.error('Error finding retweet:', findError);
        throw findError;
      }
      
      if (retweets && retweets.length > 0) {
        // Delete the retweet
        const { error: deleteError } = await supabase
          .from('tweets')
          .delete()
          .eq('id', retweets[0].id);
          
        if (deleteError) {
          console.error('Error deleting retweet:', deleteError);
          throw deleteError;
        }
      }
    } else {
      // First, fetch the original tweet to get its content
      const { data: originalTweet, error: fetchError } = await supabase
        .from('tweets')
        .select('*')
        .eq('id', tweetId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching original tweet for retweet:', fetchError);
        throw fetchError;
      }
      
      // Create a new retweet
      const { error: createError } = await supabase
        .from('tweets')
        .insert([{
          content: originalTweet.content, // Copy the original content
          image_url: originalTweet.image_url, // Copy the original image
          is_retweet: true,
          original_tweet_id: tweetId
        }]);
        
      if (createError) {
        console.error('Error creating retweet:', createError);
        throw createError;
      }
      
      // Create retweet record to increment the count
      // This will trigger the database function to increment the retweet count
      const { error: retweetError } = await supabase
        .from('retweets')
        .insert([{ user_id: user.user.id, tweet_id: tweetId }])
        .single();
        
      if (retweetError && retweetError.code !== '23505') {
        console.error('Error recording retweet:', retweetError);
        // Still return true since the tweet was created
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in retweet:', error);
    return false;
  }
};

// Check if the user has retweeted a tweet
export const checkIfUserRetweetedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    // Get the current user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return false;
    }
    
    // Check if the user has retweeted the tweet
    const { data, error } = await supabase
      .from('retweets')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking if user retweeted tweet:', error);
      throw error;
    }
    
    return data !== null;
  } catch (error) {
    console.error('Error in checkIfUserRetweetedTweet:', error);
    return false;
  }
};

// Search tweets
export const searchTweets = async (query: string, limit = 10): Promise<TweetWithAuthor[]> => {
  try {
    if (!query) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:profiles!tweets_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
    
    // Process any retweets
    const processedTweets = await processRetweetsInCollection(data as TweetWithAuthor[]);
    
    return processedTweets;
  } catch (error) {
    console.error('Error in searchTweets:', error);
    return [];
  }
};

// Search tweets by hashtag
export const searchTweetsByHashtag = async (hashtag: string, limit = 10): Promise<TweetWithAuthor[]> => {
  try {
    // Remove # prefix if present
    const cleanHashtag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
    
    if (!cleanHashtag) {
      return [];
    }
    
    // First find the hashtag id
    const { data: hashtagData, error: hashtagError } = await supabase
      .from('hashtags')
      .select('id')
      .ilike('name', cleanHashtag)
      .single();
      
    if (hashtagError || !hashtagData) {
      console.error('Error finding hashtag:', hashtagError);
      return [];
    }
    
    // Then get tweets with that hashtag
    const { data: tweetHashtags, error: relationError } = await supabase
      .from('tweet_hashtags')
      .select('tweet_id')
      .eq('hashtag_id', hashtagData.id)
      .limit(limit);
      
    if (relationError || !tweetHashtags || tweetHashtags.length === 0) {
      console.error('Error finding tweets with hashtag:', relationError);
      return [];
    }
    
    // Get the actual tweets
    const tweetIds = tweetHashtags.map(th => th.tweet_id);
    const { data: tweets, error: tweetsError } = await supabase
      .from('tweets')
      .select(`
        *,
        author:profiles!tweets_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .in('id', tweetIds)
      .order('created_at', { ascending: false });
      
    if (tweetsError) {
      console.error('Error fetching hashtag tweets:', tweetsError);
      return [];
    }
    
    // Process any retweets
    const processedTweets = await processRetweetsInCollection(tweets as TweetWithAuthor[]);
    
    return processedTweets;
  } catch (error) {
    console.error('Error in searchTweetsByHashtag:', error);
    return [];
  }
};

export default {
  createTweet,
  getTweets,
  getTweet,
  getUserTweets,
  getUserRetweets,
  deleteTweet,
  likeTweet,
  retweet,
  checkIfUserLikedTweet,
  checkIfUserRetweetedTweet,
  searchTweets,
  searchTweetsByHashtag
};
