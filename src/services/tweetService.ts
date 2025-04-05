import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor, enhanceTweetData } from '@/types/Tweet';
import { fetchTweetsWithCache, CACHE_KEYS, getTweetCacheKey } from '@/utils/tweetCacheService';
import { CACHE_DURATIONS } from '@/utils/cacheService';
import { toast } from '@/components/ui/use-toast';

// Fetch tweets using the optimized stored procedure
export const getTweets = async (
  limit: number = 10,
  offset: number = 0,
  forceRefresh: boolean = false
): Promise<TweetWithAuthor[]> => {
  try {
    console.debug(`[getTweets] Fetching tweets with limit: ${limit}, offset: ${offset}, force: ${forceRefresh}`);
    
    const cacheKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit, offset });
    
    return await fetchTweetsWithCache<TweetWithAuthor[]>(
      cacheKey,
      async () => {
        // Use the get_tweets_with_authors_reliable function which doesn't rely on join syntax
        const { data, error } = await supabase
          .rpc('get_tweets_with_authors_reliable', { 
            limit_count: limit, 
            offset_count: offset 
          });
        
        if (error) {
          console.error('[getTweets] Error fetching tweets:', error);
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn('[getTweets] No tweets returned or invalid data format');
          return [];
        }
        
        console.debug(`[getTweets] Fetched ${data.length} tweets`);
        return data.map(tweet => enhanceTweetData(tweet as TweetWithAuthor)).filter(Boolean) as TweetWithAuthor[];
      },
      CACHE_DURATIONS.SHORT,
      forceRefresh
    );
  } catch (error) {
    console.error('[getTweets] Error fetching tweets:', error);
    throw error;
  }
};

// Fetch tweets for a specific user
export const getTweetsForUser = async (
    userId: string,
    limit: number = 20,
    offset: number = 0,
    forceRefresh: boolean = false
): Promise<TweetWithAuthor[]> => {
    try {
        console.debug(`[getTweetsForUser] Fetching tweets for user ${userId} with limit: ${limit}, offset: ${offset}, force: ${forceRefresh}`);

        const cacheKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId, limit, offset });

        return await fetchTweetsWithCache<TweetWithAuthor[]>(
            cacheKey,
            async () => {
                const { data, error } = await supabase
                    .rpc('get_user_tweets_optimized', {
                        user_id: userId,
                        limit_count: limit,
                        offset_count: offset
                    });

                if (error) {
                    console.error(`[getTweetsForUser] Error fetching tweets for user ${userId}:`, error);
                    throw error;
                }

                if (!data || !Array.isArray(data)) {
                    console.warn(`[getTweetsForUser] No tweets returned for user ${userId} or invalid data format`);
                    return [];
                }

                console.debug(`[getTweetsForUser] Fetched ${data.length} tweets for user ${userId}`);
                return data.map(tweet => enhanceTweetData(tweet as TweetWithAuthor)).filter(Boolean) as TweetWithAuthor[];
            },
            CACHE_DURATIONS.SHORT,
            forceRefresh
        );
    } catch (error) {
        console.error(`[getTweetsForUser] Error fetching tweets for user ${userId}:`, error);
        throw error;
    }
};

// Fetch a single tweet by ID
export const getTweetById = async (tweetId: string): Promise<TweetWithAuthor | null> => {
    try {
        console.debug(`[getTweetById] Fetching tweet with ID: ${tweetId}`);

        const cacheKey = getTweetCacheKey(CACHE_KEYS.TWEET_DETAIL, { tweetId });

        return await fetchTweetsWithCache<TweetWithAuthor | null>(
            cacheKey,
            async () => {
                const { data, error } = await supabase
                    .rpc('get_tweet_with_author_optimized', { tweet_id: tweetId });

                if (error) {
                    console.error(`[getTweetById] Error fetching tweet with ID ${tweetId}:`, error);
                    throw error;
                }

                if (!data || !Array.isArray(data) || data.length === 0) {
                    console.warn(`[getTweetById] Tweet with ID ${tweetId} not found or invalid data format`);
                    return null;
                }

                console.debug(`[getTweetById] Fetched tweet with ID: ${tweetId}`);
                return enhanceTweetData(data[0] as TweetWithAuthor) || null;
            },
            CACHE_DURATIONS.SHORT
        );
    } catch (error) {
        console.error(`[getTweetById] Error fetching tweet with ID ${tweetId}:`, error);
        return null;
    }
};

interface CreateTweetParams {
    content: string;
    image_url?: string | null;
    author_id: string;
    is_retweet?: boolean;
    original_tweet_id?: string | null;
}

// Create a new tweet
export const createTweet = async (content: string, imageFile?: File, is_retweet: boolean = false, original_tweet_id: string | null = null): Promise<any> => {
    try {
        console.debug(`[createTweet] Creating tweet with content length: ${content.length}, hasImage: ${!!imageFile}`);

        let imageUrl: string | null = null;

        if (imageFile) {
            console.debug(`[createTweet] Uploading image file`);
            const { data: storageData, error: storageError } = await supabase.storage
                .from('tweet-images')
                .upload(`${Date.now()}_${imageFile.name}`, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (storageError) {
                console.error('[createTweet] Error uploading image:', storageError);
                throw storageError;
            }

            imageUrl = `${supabase.storageUrl}/tweet-images/${storageData.path}`;
            console.debug(`[createTweet] Image uploaded successfully. URL: ${imageUrl}`);
        }

        const user = await supabase.auth.getUser();

        if (!user?.data?.user?.id) {
            console.error('[createTweet] User not authenticated');
            throw new Error('User not authenticated');
        }

        const author_id = user.data.user.id;

        const tweetParams: CreateTweetParams = {
            content,
            image_url: imageUrl,
            author_id,
            is_retweet,
            original_tweet_id
        };

        console.debug(`[createTweet] Inserting tweet into database`);
        const { data, error } = await supabase
            .from('tweets')
            .insert([tweetParams])
            .select()
            .single();

        if (error) {
            console.error('[createTweet] Error creating tweet:', error);
            throw error;
        }

        console.debug(`[createTweet] Tweet created successfully. ID: ${data.id}`);
        return data;
    } catch (error) {
        console.error('[createTweet] Error creating tweet:', error);
        toast({
            title: "Error",
            description: "Failed to post tweet. Please try again.",
            variant: "destructive"
        });
        return null;
    }
};

// Delete a tweet
export const deleteTweet = async (tweetId: string): Promise<boolean> => {
    try {
        console.debug(`[deleteTweet] Deleting tweet with ID: ${tweetId}`);

        const { error } = await supabase
            .from('tweets')
            .delete()
            .eq('id', tweetId);

        if (error) {
            console.error(`[deleteTweet] Error deleting tweet with ID ${tweetId}:`, error);
            throw error;
        }

        console.debug(`[deleteTweet] Tweet with ID ${tweetId} deleted successfully`);
        return true;
    } catch (error) {
        console.error(`[deleteTweet] Error deleting tweet with ID ${tweetId}:`, error);
        toast({
            title: "Error",
            description: "Failed to delete tweet. Please try again.",
            variant: "destructive"
        });
        return false;
    }
};
