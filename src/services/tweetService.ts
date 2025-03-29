import { supabase } from '@/integrations/supabase/client';
import { uploadFile } from '@/services/storageService';
import { TweetWithAuthor } from '@/types/Tweet';
import { ensureProfileExists } from '@/services/profileService';

export async function createTweet(content: string, imageFile?: File): Promise<boolean> {
  try {
    console.log('[tweetService] Creating new tweet with content length:', content.length);
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[tweetService] Authentication error:', userError);
      throw new Error('User must be logged in to create a tweet');
    }
    
    console.log('[tweetService] Authenticated user ID:', userData.user.id);
    
    // Ensure this user has a profile
    const profileExists = await ensureProfileExists(userData.user.id);
    if (!profileExists) {
      console.error('[tweetService] Failed to ensure profile exists for user');
      return false;
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      try {
        console.log('[tweetService] Uploading tweet image:', imageFile.name);
        imageUrl = await uploadFile(imageFile, 'tweet-images');
        
        if (!imageUrl) {
          console.warn('[tweetService] Failed to upload image but continuing with text-only tweet');
        } else {
          console.log('[tweetService] Image uploaded successfully:', imageUrl);
        }
      } catch (uploadError) {
        console.error('[tweetService] Image upload failed:', uploadError);
      }
    }
    
    const tweetData = {
      content: content.trim(),
      author_id: userData.user.id,
      image_url: imageUrl
    };
    
    console.log('[tweetService] Creating tweet with data:', tweetData);
    
    const { error, data } = await supabase
      .from('tweets')
      .insert(tweetData)
      .select();
      
    if (error) {
      console.error('[tweetService] Error creating tweet:', error);
      return false;
    }
    
    console.log('[tweetService] Tweet successfully created with ID:', data?.[0]?.id);
    console.log('[tweetService] Tweet data from response:', data?.[0]);
    return true;
  } catch (error) {
    console.error('[tweetService] Tweet creation failed:', error);
    return false;
  }
}

export async function getTweets(limit: number = 20, offset: number = 0): Promise<TweetWithAuthor[]> {
  try {
    console.log(`[tweetService] Fetching public feed: limit=${limit}, offset=${offset}`);
    
    const { data, error } = await supabase
      .rpc('get_tweets_with_authors_reliable', {
        limit_count: limit,
        offset_count: offset
      });
      
    if (error) {
      console.error('[tweetService] Error fetching tweets for public feed:', error);
      throw error;
    }
    
    console.log(`[tweetService] Successfully fetched ${data?.length || 0} tweets using RPC function`);
    
    if (data && data.length > 0) {
      console.log('[tweetService] First tweet from RPC function:', data[0]);
    }
    
    const formattedTweets: TweetWithAuthor[] = data.map((tweet: any) => {
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
        author: {
          id: tweet.author_id,
          username: tweet.username,
          display_name: tweet.display_name,
          avatar_url: tweet.avatar_url || '',
          avatar_nft_id: tweet.avatar_nft_id,
          avatar_nft_chain: tweet.avatar_nft_chain
        }
      };
    });
    
    console.log(`[tweetService] Formatted ${formattedTweets.length} tweets for the UI`);
    if (formattedTweets.length > 0) {
      console.log('[tweetService] First formatted tweet author:', formattedTweets[0].author);
    }
    
    return formattedTweets;
  } catch (error) {
    console.error('[tweetService] Failed to fetch tweets for public feed:', error);
    return [];
  }
}

export async function getUserTweets(
  userId: string, 
  limit: number = 20, 
  offset: number = 0,
  retweetsOnly: boolean = false
): Promise<TweetWithAuthor[]> {
  try {
    if (!userId || !userId.trim()) {
      console.error('[tweetService] Invalid user ID provided');
      return [];
    }
    
    console.log(`[tweetService] Fetching ${retweetsOnly ? 'retweets' : 'tweets'} for user: ${userId}`);
    
    let data;
    let error;
    
    if (retweetsOnly) {
      const result = await supabase
        .rpc('get_user_retweets_reliable', {
          user_id: userId,
          limit_count: limit,
          offset_count: offset
        });
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .rpc('get_user_tweets_reliable', {
          user_id: userId,
          limit_count: limit,
          offset_count: offset
        });
      data = result.data;
      error = result.error;
    }
      
    if (error) {
      console.error('[tweetService] Error fetching user tweets:', error);
      throw error;
    }
    
    console.log(`[tweetService] Successfully fetched ${data?.length || 0} ${retweetsOnly ? 'retweets' : 'tweets'} for user ${userId}`);
    
    const formattedTweets: TweetWithAuthor[] = data.map((tweet: any) => {
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
        author: {
          id: tweet.author_id,
          username: tweet.username,
          display_name: tweet.display_name,
          avatar_url: tweet.avatar_url || '',
          avatar_nft_id: tweet.avatar_nft_id,
          avatar_nft_chain: tweet.avatar_nft_chain
        }
      };
    });
    
    if (formattedTweets.length > 0) {
      console.log('[tweetService] First user tweet author:', formattedTweets[0].author);
    }
    
    return formattedTweets;
  } catch (error) {
    console.error('[tweetService] Failed to fetch user tweets:', error);
    return [];
  }
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('[tweetService] Invalid tweet ID provided for like action');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[tweetService] Authentication error:', userError);
      throw new Error('User must be logged in to like a tweet');
    }
    
    const { data: existingLike, error: existingLikeError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (existingLikeError) {
      console.error('[tweetService] Error checking existing like:', existingLikeError);
      return false;
    }
    
    if (existingLike) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
        
      if (error) {
        console.error('[tweetService] Error unliking tweet:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: userData.user.id,
          tweet_id: tweetId
        });
        
      if (error) {
        console.error('[tweetService] Error liking tweet:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[tweetService] Like action failed:', error);
    return false;
  }
}

export async function retweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('[tweetService] Invalid tweet ID provided for retweet');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[tweetService] Authentication error:', userError);
      throw new Error('User must be logged in to retweet');
    }
    
    const { data: existingRetweet, error: existingRetweetError } = await supabase
      .from('retweets')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (existingRetweetError) {
      console.error('[tweetService] Error checking existing retweet:', existingRetweetError);
      return false;
    }
    
    if (existingRetweet) {
      const { error } = await supabase
        .from('retweets')
        .delete()
        .eq('id', existingRetweet.id);
        
      if (error) {
        console.error('[tweetService] Error undoing retweet:', error);
        return false;
      }
    } else {
      const { error: retweetEntryError } = await supabase
        .from('retweets')
        .insert({
          user_id: userData.user.id,
          tweet_id: tweetId
        });
        
      if (retweetEntryError) {
        console.error('[tweetService] Error creating retweet entry:', retweetEntryError);
        return false;
      }
      
      const { error: retweetTweetError } = await supabase
        .from('tweets')
        .insert({
          author_id: userData.user.id,
          content: '',
          is_retweet: true,
          original_tweet_id: tweetId
        });
        
      if (retweetTweetError) {
        console.error('[tweetService] Error creating retweet tweet:', retweetTweetError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[tweetService] Retweet action failed:', error);
    return false;
  }
}

export async function checkIfUserLikedTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('[tweetService] Error checking like status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('[tweetService] Failed to check like status:', error);
    return false;
  }
}

export async function checkIfUserRetweetedTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('retweets')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
      
    if (error) {
      console.error('[tweetService] Error checking retweet status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('[tweetService] Failed to check retweet status:', error);
    return false;
  }
}

export async function getOriginalTweet(originalTweetId: string): Promise<TweetWithAuthor | null> {
  try {
    if (!originalTweetId || !originalTweetId.trim()) {
      return null;
    }
    
    console.log(`[tweetService] Fetching original tweet: ${originalTweetId}`);
    
    const { data, error } = await supabase
      .rpc('get_tweet_with_author_reliable', {
        tweet_id: originalTweetId
      });
      
    if (error) {
      console.error('[tweetService] Error fetching original tweet:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const tweet = data[0];
      console.log('[tweetService] Found original tweet:', tweet);
      
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
        author: {
          id: tweet.author_id,
          username: tweet.username,
          display_name: tweet.display_name,
          avatar_url: tweet.avatar_url || '',
          avatar_nft_id: tweet.avatar_nft_id,
          avatar_nft_chain: tweet.avatar_nft_chain
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('[tweetService] Failed to fetch original tweet:', error);
    return null;
  }
}

export async function deleteTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('[tweetService] Invalid tweet ID provided for deletion');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[tweetService] Authentication error:', userError);
      throw new Error('User must be logged in to delete a tweet');
    }
    
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .select('author_id')
      .eq('id', tweetId)
      .single();
      
    if (tweetError) {
      console.error('[tweetService] Error verifying tweet ownership:', tweetError);
      return false;
    }
    
    if (tweetData.author_id !== userData.user.id) {
      console.error('[tweetService] Cannot delete tweet: user is not the author');
      return false;
    }
    
    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);
      
    if (error) {
      console.error('[tweetService] Error deleting tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[tweetService] Delete action failed:', error);
    return false;
  }
}

export async function replyToTweet(tweetId: string, content: string, parentReplyId?: string, imageFile?: File): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('[tweetService] Invalid tweet ID provided for reply');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[tweetService] Authentication error:', userError);
      throw new Error('User must be logged in to reply to a tweet');
    }
    
    const { data: tweetExists, error: tweetCheckError } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();
      
    if (tweetCheckError || !tweetExists) {
      console.error('[tweetService] Tweet does not exist or cannot be accessed:', tweetCheckError);
      return false;
    }
    
    if (parentReplyId) {
      const { data: parentReplyExists, error: parentReplyCheckError } = await supabase
        .from('replies')
        .select('id')
        .eq('id', parentReplyId)
        .single();
        
      if (parentReplyCheckError || !parentReplyExists) {
        console.error('[tweetService] Parent reply does not exist or cannot be accessed:', parentReplyCheckError);
        return false;
      }
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      try {
        imageUrl = await uploadFile(imageFile, 'tweet-replies');
        
        if (!imageUrl) {
          console.warn('[tweetService] Failed to upload image but continuing with text-only reply');
        }
      } catch (uploadError) {
        console.error('[tweetService] Image upload failed:', uploadError);
      }
    }
    
    const replyData = {
      content: content.trim(),
      user_id: userData.user.id,
      tweet_id: tweetId,
      parent_reply_id: parentReplyId || null,
      image_url: imageUrl
    };
    
    const { error } = await supabase
      .from('replies')
      .insert(replyData);
      
    if (error) {
      console.error('[tweetService] Error replying to tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[tweetService] Reply action failed:', error);
    return false;
  }
}

export async function getTweetReplies(tweetId: string): Promise<any[]> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('[tweetService] Invalid tweet ID provided');
      return [];
    }
    
    const { data, error } = await supabase
      .from('replies')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('[tweetService] Error fetching tweet replies:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[tweetService] Failed to fetch tweet replies:', error);
    return [];
  }
}
