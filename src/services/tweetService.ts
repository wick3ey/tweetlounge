import { supabase } from '@/integrations/supabase/client';
import { uploadFile } from '@/services/storageService';
import { TweetWithAuthor } from '@/types/Tweet';

export async function createTweet(content: string, imageFile?: File): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to create a tweet');
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      try {
        imageUrl = await uploadFile(imageFile, 'tweet-images');
        
        if (!imageUrl) {
          console.warn('Failed to upload image but continuing with text-only tweet');
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }
    
    const tweetData = {
      content: content.trim(),
      author_id: userData.user.id,
      image_url: imageUrl
    };
    
    const { error } = await supabase
      .from('tweets')
      .insert(tweetData);
      
    if (error) {
      console.error('Error creating tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Tweet creation failed:', error);
    return false;
  }
}

export async function getTweets(limit: number = 20, offset: number = 0): Promise<TweetWithAuthor[]> {
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
    
    const formattedTweets: TweetWithAuthor[] = data.map((tweet: any) => ({
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
        avatar_url: tweet.avatar_url,
        avatar_nft_id: tweet.avatar_nft_id,
        avatar_nft_chain: tweet.avatar_nft_chain
      }
    }));
    
    return formattedTweets;
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
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
      console.error('Invalid user ID provided');
      return [];
    }
    
    let data;
    let error;
    
    if (retweetsOnly) {
      const response = await supabase
        .rpc('get_user_retweets', {
          user_id: userId,
          limit_count: limit,
          offset_count: offset
        });
      data = response.data;
      error = response.error;
    } else {
      const response = await supabase
        .rpc('get_user_tweets', {
          user_id: userId,
          limit_count: limit,
          offset_count: offset
        });
      data = response.data;
      error = response.error;
    }
      
    if (error) {
      console.error('Error fetching user tweets:', error);
      throw error;
    }
    
    const formattedTweets: TweetWithAuthor[] = data.map((tweet: any) => ({
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
        avatar_url: tweet.avatar_url,
        avatar_nft_id: tweet.avatar_nft_id,
        avatar_nft_chain: tweet.avatar_nft_chain
      }
    }));
    
    return formattedTweets;
  } catch (error) {
    console.error('Failed to fetch user tweets:', error);
    return [];
  }
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided for like action');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to like a tweet');
    }
    
    // Check if user has already liked the tweet
    const { data: existingLike, error: existingLikeError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .single();
      
    if (existingLikeError && existingLikeError.code !== 'PGRST116') {
      console.error('Error checking existing like:', existingLikeError);
      return false;
    }
    
    if (existingLike) {
      // Unlike if already liked
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
        
      if (error) {
        console.error('Error unliking tweet:', error);
        return false;
      }
    } else {
      // Like if not already liked
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: userData.user.id,
          tweet_id: tweetId
        });
        
      if (error) {
        console.error('Error liking tweet:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Like action failed:', error);
    return false;
  }
}

export async function retweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided for retweet');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to retweet');
    }
    
    // Check if user has already retweeted
    const { data: existingRetweet, error: existingRetweetError } = await supabase
      .from('retweets')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .single();
      
    if (existingRetweetError && existingRetweetError.code !== 'PGRST116') {
      console.error('Error checking existing retweet:', existingRetweetError);
      return false;
    }
    
    if (existingRetweet) {
      // Undo retweet if already retweeted
      const { error } = await supabase
        .from('retweets')
        .delete()
        .eq('id', existingRetweet.id);
        
      if (error) {
        console.error('Error undoing retweet:', error);
        return false;
      }
    } else {
      // Create a retweet reference
      const { error: retweetEntryError } = await supabase
        .from('retweets')
        .insert({
          user_id: userData.user.id,
          tweet_id: tweetId
        });
        
      if (retweetEntryError) {
        console.error('Error creating retweet entry:', retweetEntryError);
        return false;
      }
      
      // Create a retweet tweet
      const { error: retweetTweetError } = await supabase
        .from('tweets')
        .insert({
          author_id: userData.user.id,
          content: '',
          is_retweet: true,
          original_tweet_id: tweetId
        });
        
      if (retweetTweetError) {
        console.error('Error creating retweet tweet:', retweetTweetError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Retweet action failed:', error);
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
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking like status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Failed to check like status:', error);
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
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking retweet status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Failed to check retweet status:', error);
    return false;
  }
}

export async function getOriginalTweet(originalTweetId: string): Promise<TweetWithAuthor | null> {
  try {
    if (!originalTweetId || !originalTweetId.trim()) {
      return null;
    }
    
    const { data, error } = await supabase
      .rpc('get_tweet_with_author', {
        tweet_id: originalTweetId
      });
      
    if (error) {
      console.error('Error fetching original tweet:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const tweet = data[0];
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
          avatar_url: tweet.avatar_url,
          avatar_nft_id: tweet.avatar_nft_id,
          avatar_nft_chain: tweet.avatar_nft_chain
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch original tweet:', error);
    return null;
  }
}

export async function deleteTweet(tweetId: string): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided for deletion');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to delete a tweet');
    }
    
    // Verify tweet ownership
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .select('author_id')
      .eq('id', tweetId)
      .single();
      
    if (tweetError) {
      console.error('Error verifying tweet ownership:', tweetError);
      return false;
    }
    
    if (tweetData.author_id !== userData.user.id) {
      console.error('Cannot delete tweet: user is not the author');
      return false;
    }
    
    // Delete the tweet
    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);
      
    if (error) {
      console.error('Error deleting tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Delete action failed:', error);
    return false;
  }
}

export async function replyToTweet(tweetId: string, content: string, parentReplyId?: string, imageFile?: File): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided for reply');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to reply to a tweet');
    }
    
    // Verify the tweet exists before attempting to reply
    const { data: tweetExists, error: tweetCheckError } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();
      
    if (tweetCheckError || !tweetExists) {
      console.error('Tweet does not exist or cannot be accessed:', tweetCheckError);
      return false;
    }
    
    // If this is a reply to another reply, verify the parent reply exists
    if (parentReplyId) {
      const { data: parentReplyExists, error: parentReplyCheckError } = await supabase
        .from('replies')
        .select('id')
        .eq('id', parentReplyId)
        .single();
        
      if (parentReplyCheckError || !parentReplyExists) {
        console.error('Parent reply does not exist or cannot be accessed:', parentReplyCheckError);
        return false;
      }
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      try {
        imageUrl = await uploadFile(imageFile, 'tweet-replies');
        
        if (!imageUrl) {
          console.warn('Failed to upload image but continuing with text-only reply');
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
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
      console.error('Error replying to tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Reply action failed:', error);
    return false;
  }
}

export async function getTweetReplies(tweetId: string): Promise<any[]> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided');
      return [];
    }
    
    // Verify the tweet exists before fetching replies
    const { data: tweetExists, error: tweetCheckError } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();
      
    if (tweetCheckError) {
      console.error('Error verifying tweet existence:', tweetCheckError);
      // We'll still attempt to fetch replies in case it's a permissions issue
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
      .order('created_at');
      
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
