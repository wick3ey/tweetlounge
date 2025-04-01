import { supabase } from '@/lib/supabase';
import { Tweet, TweetWithAuthor, enhanceTweetData, createPartialProfile } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { createNotification, deleteNotification } from './notificationService';
import { 
  fetchTweetsWithCache, 
  getTweetCacheKey, 
  invalidateTweetCache,
  updateTweetInCache,
  CACHE_KEYS
} from '@/utils/tweetCacheService';
import { CACHE_DURATIONS } from '@/utils/cacheService';

const tweetCache = new Map<string, TweetWithAuthor>();
const CACHE_EXPIRY = 60000; // 1 minute cache expiry

export async function createTweet(content: string, imageFile?: File): Promise<Tweet | null> {
  console.debug('[createTweet] Starting tweet creation with content length:', content.length, 'Has image:', !!imageFile);
  try {
    console.debug('[createTweet] Getting current user');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[createTweet] Error getting user:', userError);
      throw userError;
    }
    
    const user = userData?.user;
    console.debug('[createTweet] User authenticated:', !!user);
    
    if (!user) {
      console.error('[createTweet] No authenticated user found');
      throw new Error('User must be logged in to create a tweet');
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      console.debug('[createTweet] Processing image:', imageFile.name, 'Size:', (imageFile.size / 1024).toFixed(2) + 'KB', 'Type:', imageFile.type);
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.debug('[createTweet] Uploading image to storage path:', filePath);
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('tweet-images')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        console.error('[createTweet] Error uploading image:', uploadError);
        throw uploadError;
      }
      
      console.debug('[createTweet] Image uploaded successfully, generating public URL');
      const { data } = supabase.storage
        .from('tweet-images')
        .getPublicUrl(filePath);
        
      imageUrl = data.publicUrl;
      console.debug('[createTweet] Generated image URL:', imageUrl);
    }
    
    console.debug('[createTweet] Creating tweet in database');
    const { data, error } = await supabase
      .from('tweets')
      .insert({
        content,
        author_id: user.id,
        image_url: imageUrl
      } as any)
      .select()
      .single();
      
    if (error) {
      console.error('[createTweet] Error creating tweet in database:', error);
      throw error;
    }
    
    console.debug('[createTweet] Tweet created successfully with ID:', data.id);
    
    const homeFeedKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit: 20, offset: 0 });
    const userTweetsKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId: user.id, limit: 20, offset: 0 });
    
    console.debug('[createTweet] Invalidating cache keys:', homeFeedKey, userTweetsKey);
    invalidateTweetCache(homeFeedKey);
    invalidateTweetCache(userTweetsKey);
    
    console.debug('[createTweet] Tweet creation completed successfully');
    return data as Tweet;
  } catch (error) {
    console.error('[createTweet] Tweet creation failed:', error);
    return null;
  }
}

export async function getTweets(limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  const cacheKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit, offset });
  
  return fetchTweetsWithCache<TweetWithAuthor[]>(
    cacheKey,
    async () => {
      console.time('getTweets');
      
      // Use direct RPC call for better performance
      const { data, error } = await supabase
        .rpc('get_tweets_with_authors_reliable', { 
          limit_count: limit, 
          offset_count: offset 
        });
        
      if (error) {
        console.error('Error fetching tweets:', error);
        throw error;
      }
      
      if (!data) return [];
      
      // Process tweets in parallel for better performance
      const transformedData = await Promise.all((data as any[]).map(async (item) => {
        // Basic initial transform
        const tweet: TweetWithAuthor = {
          id: item.id,
          content: item.content,
          author_id: item.author_id,
          created_at: item.created_at,
          likes_count: item.likes_count || 0,
          retweets_count: item.retweets_count || 0,
          replies_count: item.replies_count || 0,
          is_retweet: item.is_retweet === true,
          original_tweet_id: item.original_tweet_id,
          image_url: item.image_url,
          profile_username: item.profile_username || item.username,
          profile_display_name: item.profile_display_name || item.display_name,
          profile_avatar_url: item.profile_avatar_url || item.avatar_url,
          profile_avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
          profile_avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain,
          author: createPartialProfile({
            id: item.author_id,
            username: item.profile_username || item.username,
            display_name: item.profile_display_name || item.display_name || item.username,
            avatar_url: item.profile_avatar_url || item.avatar_url || '',
            avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
            avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain
          })
        };
        
        // Enhance the tweet data
        const enhancedTweet = enhanceTweetData(tweet);
        if (!enhancedTweet) return null;
        
        // Process retweets if needed
        if (enhancedTweet.is_retweet && enhancedTweet.original_tweet_id) {
          try {
            // Check cache first
            const cachedOriginalTweet = tweetCache.get(enhancedTweet.original_tweet_id);
            
            if (cachedOriginalTweet) {
              return {
                ...enhancedTweet,
                content: cachedOriginalTweet.content,
                image_url: cachedOriginalTweet.image_url,
                original_author: createPartialProfile({
                  id: cachedOriginalTweet.author.id,
                  username: cachedOriginalTweet.author.username,
                  display_name: cachedOriginalTweet.author.display_name,
                  avatar_url: cachedOriginalTweet.author.avatar_url,
                  avatar_nft_id: cachedOriginalTweet.author.avatar_nft_id,
                  avatar_nft_chain: cachedOriginalTweet.author.avatar_nft_chain
                })
              };
            }
            
            // If not in cache, fetch from database
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: enhancedTweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              return { ...enhancedTweet, is_retweet: false };
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
              const originalTweet = originalTweetData[0];
              
              // Create processed tweet
              const processedTweet = {
                ...enhancedTweet,
                content: originalTweet.content,
                image_url: originalTweet.image_url,
                original_author: createPartialProfile({
                  id: originalTweet.author_id,
                  username: originalTweet.username || 'user',
                  display_name: originalTweet.display_name || originalTweet.username || 'User',
                  avatar_url: originalTweet.avatar_url || '',
                  avatar_nft_id: originalTweet.avatar_nft_id,
                  avatar_nft_chain: originalTweet.avatar_nft_chain
                })
              };
              
              // Cache the original tweet for future retweets
              tweetCache.set(enhancedTweet.original_tweet_id, {
                ...processedTweet,
                cacheTimestamp: Date.now()
              });
              
              return processedTweet;
            } else {
              return { ...enhancedTweet, is_retweet: false };
            }
          } catch (err) {
            console.error('Error fetching original tweet:', err);
            return { ...enhancedTweet, is_retweet: false };
          }
        }
        
        return enhancedTweet;
      }));
      
      console.timeEnd('getTweets');
      
      // Filter out nulls and enhance tweets
      return transformedData.filter((tweet): tweet is TweetWithAuthor => tweet !== null);
    },
    CACHE_DURATIONS.MEDIUM
  );
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tweetCache.entries()) {
    if (value.cacheTimestamp && now - value.cacheTimestamp > CACHE_EXPIRY) {
      tweetCache.delete(key);
    }
  }
}, 60000); // Run every minute

export async function getUserTweets(userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  const cacheKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId, limit, offset });
  
  return fetchTweetsWithCache<TweetWithAuthor[]>(
    cacheKey,
    async () => {
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
      
      if (!data) return [];
      
      const transformedData: TweetWithAuthor[] = (data as any[]).map((item: any) => {
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
          profile_username: item.profile_username || item.username,
          profile_display_name: item.profile_display_name || item.display_name,
          profile_avatar_url: item.profile_avatar_url || item.avatar_url,
          profile_avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
          profile_avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain,
          author: createPartialProfile({
            id: item.author_id,
            username: item.profile_username || item.username,
            display_name: item.profile_display_name || item.display_name,
            avatar_url: item.profile_avatar_url || item.avatar_url || '',
            avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
            avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain
          })
        };
      });
      
      return transformedData;
    },
    CACHE_DURATIONS.MEDIUM
  );
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to like a tweet');
    }
    
    const { data: existingLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
    
    const { data: tweet } = await supabase
      .from('tweets')
      .select('author_id, likes_count')
      .eq('id', tweetId)
      .single();
    
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      if (tweet && tweet.likes_count > 0) {
        const newCount = tweet.likes_count - 1;
        await supabase
          .from('tweets')
          .update({ likes_count: newCount })
          .eq('id', tweetId);
      }
      
      await deleteNotification(tweet.author_id, user.id, 'like', tweetId);
      
      return true;
    } else {
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          tweet_id: tweetId
        });
      
      if (insertError) {
        throw insertError;
      }
      
      if (tweet) {
        const newCount = (tweet.likes_count || 0) + 1;
        await supabase
          .from('tweets')
          .update({ likes_count: newCount })
          .eq('id', tweetId);
      }
      
      await createNotification(tweet.author_id, user.id, 'like', tweetId);
      
      return true;
    }
  } catch (error) {
    console.error('Error liking/unliking tweet:', error);
    return false;
  }
}

export async function retweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to retweet');
    }
    
    if (!tweetId) {
      console.error('Invalid tweetId provided for retweet operation');
      return false;
    }
    
    const { data: originalTweet, error: originalTweetCheckError } = await supabase
      .from('tweets')
      .select('id, content, image_url, author_id')
      .eq('id', tweetId)
      .single();
    
    if (originalTweetCheckError || !originalTweet) {
      console.error('Original tweet does not exist for retweeting:', originalTweetCheckError);
      throw new Error('Cannot retweet - original tweet not found');
    }
    
    const { data: existingRetweet } = await supabase
      .from('retweets')
      .select('*')
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
    
    const { data: originalTweetData, error: originalTweetError } = await supabase
      .rpc('get_tweet_with_author_reliable', { tweet_id: tweetId });
    
    if (originalTweetError) {
      console.error('Error fetching original tweet for retweet:', originalTweetError);
      throw originalTweetError;
    }
    
    if (!originalTweetData || originalTweetData.length === 0) {
      console.error('Original tweet not found for retweeting');
      throw new Error('Original tweet not found');
    }
    
    const originalTweetInfo = originalTweetData[0];
    
    if (!originalTweetInfo || !originalTweetInfo.content) {
      console.error('Invalid original tweet data for retweet');
      return false;
    }
    
    const { data: tweet } = await supabase
      .from('tweets')
      .select('author_id, content, image_url, retweets_count')
      .eq('id', tweetId)
      .single();
    
    if (existingRetweet) {
      const { data: retweetTweet, error: retweetTweetError } = await supabase
        .from('tweets')
        .select('id')
        .eq('author_id', user.id)
        .eq('is_retweet', true)
        .eq('original_tweet_id', tweetId)
        .maybeSingle();
        
      if (retweetTweetError) {
        console.error('Error finding retweet tweet:', retweetTweetError);
      }
      
      const { error: deleteError } = await supabase
        .from('retweets')
        .delete()
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId);
      
      if (deleteError) {
        console.error('Error deleting retweet:', deleteError);
        throw deleteError;
      }
      
      if (retweetTweet?.id) {
        const { error: deleteTweetError } = await supabase
          .from('tweets')
          .delete()
          .eq('id', retweetTweet.id);
        
        if (deleteTweetError) {
          console.error('Error deleting retweet tweet by ID:', deleteTweetError);
          const { error: fallbackDeleteError } = await supabase
            .from('tweets')
            .delete()
            .eq('author_id', user.id)
            .eq('is_retweet', true)
            .eq('original_tweet_id', tweetId);
          
          if (fallbackDeleteError) {
            console.error('Error with fallback delete of retweet tweet:', fallbackDeleteError);
            throw fallbackDeleteError;
          }
        }
      } else {
        const { error: deleteTweetError } = await supabase
          .from('tweets')
          .delete()
          .eq('author_id', user.id)
          .eq('is_retweet', true)
          .eq('original_tweet_id', tweetId);
        
        if (deleteTweetError) {
          console.error('Error deleting retweet tweet:', deleteTweetError);
          throw deleteTweetError;
        }
      }
      
      if (tweet && tweet.retweets_count > 0) {
        const newCount = tweet.retweets_count - 1;
        await supabase
          .from('tweets')
          .update({ retweets_count: newCount })
          .eq('id', tweetId);
      }
      
      await deleteNotification(tweet.author_id, user.id, 'retweet', tweetId);
      
      return true;
    } else {
      if (!originalTweetInfo || !originalTweetInfo.content) {
        console.error('Cannot create retweet: missing original tweet data');
        throw new Error('Original tweet data is missing or invalid');
      }
      
      const { error: insertError } = await supabase
        .from('retweets')
        .insert({
          user_id: user.id,
          tweet_id: tweetId
        });
      
      if (insertError) {
        console.error('Error inserting retweet:', insertError);
        throw insertError;
      }
      
      if (!tweetId) {
        console.error('Cannot create retweet tweet: missing original tweet ID');
        throw new Error('Original tweet ID is required for retweet');
      }
      
      const retweetData = {
        author_id: user.id,
        content: originalTweetInfo.content || 'Retweet',
        is_retweet: true,
        original_tweet_id: tweetId,
        image_url: originalTweetInfo.image_url
      };
      
      const { error: createTweetError } = await supabase
        .from('tweets')
        .insert(retweetData);
      
      if (createTweetError) {
        console.error('Error creating retweet tweet:', createTweetError);
        throw createTweetError;
      }
      
      if (tweet) {
        const newCount = (tweet.retweets_count || 0) + 1;
        await supabase
          .from('tweets')
          .update({ retweets_count: newCount })
          .eq('id', tweetId);
      }
      
      await createNotification(originalTweetInfo.author_id, user.id, 'retweet', tweetId);
      
      return true;
    }
  } catch (error) {
    console.error('Error retweeting/unretweeting:', error);
    return false;
  }
}

export async function replyToTweet(tweetId: string, content: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to comment');
    }
    
    if (!content || content.trim() === '') {
      throw new Error('Comment content cannot be empty');
    }
    
    const { error: commentError } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        tweet_id: tweetId,
        content: content.trim()
      });
    
    if (commentError) {
      throw commentError;
    }
    
    const { data: tweet } = await supabase
      .from('tweets')
      .select('author_id, replies_count')
      .eq('id', tweetId)
      .single();
    
    const { count, error: countError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (countError) {
      console.error('Error counting comments:', countError);
    } else {
      const newCount = count || 0;
      
      const { error: updateError } = await supabase
        .from('tweets')
        .update({ replies_count: newCount })
        .eq('id', tweetId);
        
      if (updateError) {
        console.error('Error updating tweet replies count:', updateError);
      } else {
        console.log(`Updated tweet ${tweetId} replies_count to ${newCount}`);
      }
    }
    
    if (tweet) {
      await createNotification(tweet.author_id, user.id, 'comment', tweetId);
    }
    
    return true;
  } catch (error) {
    console.error('Error commenting on tweet:', error);
    return false;
  }
}

export async function checkIfUserLikedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Check like status failed:', error);
    return false;
  }
}

export async function checkIfUserRetweetedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('retweets')
      .select('*')
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking retweet status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Check retweet status failed:', error);
    return false;
  }
}

export async function getTweetComments(tweetId: string, limit = 20, offset = 0): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_comments', {
        p_tweet_id: tweetId,
        limit_count: limit,
        offset_count: offset
      });
      
    if (error) {
      console.error('Error fetching tweet comments:', error);
      throw error;
    }
    
    const formattedComments: Comment[] = (data || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      tweet_id: comment.tweet_id,
      parent_comment_id: comment.parent_comment_id,
      created_at: comment.created_at,
      likes_count: comment.likes_count,
      author: {
        username: comment.profile_username,
        display_name: comment.profile_display_name,
        avatar_url: comment.profile_avatar_url || '',
        avatar_nft_id: comment.profile_avatar_nft_id,
        avatar_nft_chain: comment.profile_avatar_nft_chain
      }
    }));
    
    return formattedComments;
  } catch (error) {
    console.error('Failed to fetch tweet comments:', error);
    return [];
  }
}

export async function getUserRetweets(userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .from('retweets')
      .select(`
        tweet_id,
        tweets:tweet_id (
          id,
          content,
          author_id,
          created_at,
          likes_count,
          retweets_count,
          replies_count,
          is_retweet,
          original_tweet_id,
          image_url,
          profiles:author_id (
            username,
            display_name,
            avatar_url,
            avatar_nft_id,
            avatar_nft_chain
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error fetching user retweets:', error);
      throw error;
    }
    
    if (!data) return [];
    
    const transformedData: TweetWithAuthor[] = data.map((item: any) => {
      const tweet = item.tweets;
      const profileData = tweet.profiles;
      
      return {
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
        profile_username: profileData.username,
        profile_display_name: profileData.display_name,
        profile_avatar_url: profileData.avatar_url,
        profile_avatar_nft_id: profileData.avatar_nft_id,
        profile_avatar_nft_chain: profileData.avatar_nft_chain,
        author: createPartialProfile({
          id: tweet.author_id,
          username: profileData.username,
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url || '',
          avatar_nft_id: profileData.avatar_nft_id,
          avatar_nft_chain: profileData.avatar_nft_chain
        })
      };
    });
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch user retweets:', error);
    return [];
  }
}

export async function deleteTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to delete a tweet');
    }
    
    const { data: tweet, error: fetchError } = await supabase
      .from('tweets')
      .select('author_id')
      .eq('id', tweetId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error fetching tweet:', fetchError);
      throw fetchError;
    }
    
    if (!tweet) {
      console.error('Tweet not found or already deleted');
      return true;
    }
    
    if (tweet.author_id !== user.id) {
      throw new Error('You can only delete your own tweets');
    }
    
    const { error: bookmarksDeleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('tweet_id', tweetId);
      
    if (bookmarksDeleteError) {
      console.error('Error deleting related bookmarks:', bookmarksDeleteError);
      // Continue with deletion anyway
    }
    
    const { error: likesDeleteError } = await supabase
      .from('likes')
      .delete()
      .eq('tweet_id', tweetId);
      
    if (likesDeleteError) {
      console.error('Error deleting related likes:', likesDeleteError);
      // Continue with deletion anyway
    }
    
    const { error: retweetsDeleteError } = await supabase
      .from('retweets')
      .delete()
      .eq('tweet_id', tweetId);
      
    if (retweetsDeleteError) {
      console.error('Error deleting related retweets:', retweetsDeleteError);
      // Continue with deletion anyway
    }
    
    const { error: deleteError } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);
      
    if (deleteError) {
      console.error('Error deleting tweet:', deleteError);
      throw deleteError;
    }
    
    await invalidateTweetCache(tweetId);
    
    return true;
  } catch (error) {
    console.error('Tweet deletion failed:', error);
    return false;
  }
}
