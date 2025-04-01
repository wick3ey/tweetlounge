import { supabase } from '@/lib/supabase';
import { TweetWithAuthor, enhanceTweetData } from '@/types/Tweet';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchTweetsWithCache, 
  getTweetCacheKey, 
  CACHE_KEYS,
  invalidateTweetCache,
  cacheTweets
} from '@/utils/tweetCacheService';
import { extractHashtags, storeHashtags } from '@/utils/hashtagService';
import { Profile } from '@/lib/supabase';
import { loadNFTData } from '@/utils/nftService';

export const createTweet = async (content: string, imageFile?: File): Promise<TweetWithAuthor | null> => {
  console.debug('[createTweet] Starting tweet creation with content length:', content.length, 'Has image:', !!imageFile);
  
  try {
    console.debug('[createTweet] Getting current user');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[createTweet] User authentication error:', userError?.message || 'No user data');
      return null;
    }
    
    console.debug('[createTweet] User authenticated:', !!userData.user);
    
    // Set up the tweet data
    const tweetId = uuidv4();
    let imageUrl: string | null = null;
    
    // If there's an image, upload it first
    if (imageFile) {
      console.debug('[createTweet] Uploading image:', imageFile.name, 'Size:', (imageFile.size / 1024).toFixed(2) + 'KB');
      
      const filePath = `public/${userData.user.id}/${tweetId}/${imageFile.name}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('tweets')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('[createTweet] Image upload error:', uploadError.message);
        return null;
      }
      
      console.debug('[createTweet] Image uploaded successfully');
      
      // Get the public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('tweets')
        .getPublicUrl(filePath);
      
      imageUrl = urlData.publicUrl;
      console.debug('[createTweet] Image public URL:', imageUrl);
    }
    
    // Extract hashtags
    const hashtags = extractHashtags(content);
    if (hashtags.length > 0) {
      console.debug('[createTweet] Extracted hashtags:', hashtags);
    }
    
    console.debug('[createTweet] Creating tweet in database');
    
    // Insert the tweet
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .insert({
        id: tweetId,
        content,
        author_id: userData.user.id,
        image_url: imageUrl
      })
      .select()
      .single();
    
    if (tweetError || !tweetData) {
      console.error('[createTweet] Tweet creation error:', tweetError?.message || 'No tweet data returned');
      return null;
    }
    
    console.debug('[createTweet] Tweet created successfully with ID:', tweetData.id);
    
    // Store hashtags if there are any
    if (hashtags.length > 0) {
      await storeHashtags(hashtags, tweetData.id);
    }
    
    // Get the profile data of the author
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError || !profileData) {
      console.error('[createTweet] Profile fetch error:', profileError?.message || 'No profile data');
      // We can still return the tweet without profile data
    }
    
    // Create the enhanced tweet object
    const createdTweet: TweetWithAuthor = {
      ...tweetData,
      author: profileData as Profile,
      likes_count: 0,
      retweets_count: 0,
      replies_count: 0,
      is_retweet: false
    };
    
    const enhancedTweet = enhanceTweetData(createdTweet);
    
    // Invalidate cache to ensure fresh data
    const cacheKeysToClear = [
      getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit: 20, offset: 0 }),
      getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { limit: 20, offset: 0, userId: userData.user.id })
    ];
    
    console.debug('[createTweet] Invalidating cache keys:', cacheKeysToClear.join(', '));
    
    // Force cache invalidation for critical cache keys
    await Promise.all(cacheKeysToClear.map(key => invalidateTweetCache(key)));
    
    // Clear any profile-related caches directly from localStorage
    try {
      localStorage.removeItem(`tweet-cache-profile-${userData.user.id}-posts-limit:20-offset:0`);
      console.debug('[createTweet] Cleared profile posts cache');
    } catch (e) {
      console.error('[createTweet] Error clearing profile cache:', e);
    }
    
    console.debug('[createTweet] Tweet creation completed successfully');
    return enhancedTweet;
  } catch (error) {
    console.error('[createTweet] Unexpected error in tweet creation:', error);
    return null;
  }
};

export const getTweets = async (
  limit = 20, 
  offset = 0,
  forceRefresh = false
): Promise<TweetWithAuthor[]> => {
  console.debug(`[getTweets] Fetching tweets with limit: ${limit}, offset: ${offset}, forceRefresh: ${forceRefresh}`);
  
  const cacheKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit, offset });
  
  try {
    if (forceRefresh) {
      console.debug('[getTweets] Force refresh requested, bypassing all caches');
      
      // Directly fetch from database, bypassing all caches
      const { data, error } = await supabase
        .rpc('get_tweets_with_authors_reliable', { 
          limit_count: limit, 
          offset_count: offset 
        });
      
      if (error) {
        console.error('[getTweets] Error fetching tweets:', error.message);
        throw error;
      }
      
      if (!data) {
        console.debug('[getTweets] No tweets found');
        return [];
      }
      
      console.debug(`[getTweets] Got ${data.length} tweets directly from database`);
      
      const tweets = (data as any[]).map(tweet => {
        return enhanceTweetData({
          id: tweet.id,
          content: tweet.content,
          author_id: tweet.author_id,
          created_at: tweet.created_at,
          likes_count: tweet.likes_count || 0,
          retweets_count: tweet.retweets_count || 0,
          replies_count: tweet.replies_count || 0,
          is_retweet: tweet.is_retweet === true,
          original_tweet_id: tweet.original_tweet_id,
          image_url: tweet.image_url,
          author: {
            id: tweet.author_id,
            username: tweet.profile_username || 'user',
            display_name: tweet.profile_display_name || 'User',
            avatar_url: tweet.profile_avatar_url || '',
            bio: null,
            cover_url: null,
            location: null,
            website: null,
            updated_at: null,
            created_at: new Date().toISOString(),
            ethereum_address: null,
            solana_address: null,
            avatar_nft_id: tweet.profile_avatar_nft_id,
            avatar_nft_chain: tweet.profile_avatar_nft_chain,
            followers_count: 0,
            following_count: 0,
            replies_sort_order: null
          }
        });
      });
      
      // Update cache with fresh data for future requests
      await cacheTweets(cacheKey, tweets);
      
      return tweets;
    }
    
    return await fetchTweetsWithCache<TweetWithAuthor[]>(
      cacheKey,
      async () => {
        console.debug('[getTweets] Cache miss, fetching from database');
        
        const { data, error } = await supabase
          .rpc('get_tweets_with_authors_reliable', { 
            limit_count: limit, 
            offset_count: offset 
          });
        
        if (error) {
          console.error('[getTweets] Error fetching tweets:', error.message);
          throw error;
        }
        
        if (!data) {
          console.debug('[getTweets] No tweets found');
          return [];
        }
        
        console.debug(`[getTweets] Got ${data.length} tweets from database`);
        
        return (data as any[]).map(tweet => {
          return enhanceTweetData({
            id: tweet.id,
            content: tweet.content,
            author_id: tweet.author_id,
            created_at: tweet.created_at,
            likes_count: tweet.likes_count || 0,
            retweets_count: tweet.retweets_count || 0,
            replies_count: tweet.replies_count || 0,
            is_retweet: tweet.is_retweet === true,
            original_tweet_id: tweet.original_tweet_id,
            image_url: tweet.image_url,
            author: {
              id: tweet.author_id,
              username: tweet.profile_username || 'user',
              display_name: tweet.profile_display_name || 'User',
              avatar_url: tweet.profile_avatar_url || '',
              bio: null,
              cover_url: null,
              location: null,
              website: null,
              updated_at: null,
              created_at: new Date().toISOString(),
              ethereum_address: null,
              solana_address: null,
              avatar_nft_id: tweet.profile_avatar_nft_id,
              avatar_nft_chain: tweet.profile_avatar_nft_chain,
              followers_count: 0,
              following_count: 0,
              replies_sort_order: null
            }
          });
        });
      },
      forceRefresh
    );
  } catch (error) {
    console.error('[getTweets] Error fetching tweets:', error);
    return [];
  }
};
