import { supabase } from '@/integrations/supabase/client';
import { Tweet, TweetWithAuthor } from '@/types/Tweet';
import { uploadFile } from './storageService';

export async function createTweet(content: string, imageFile?: File): Promise<Tweet | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User must be logged in to create a tweet');
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadFile(imageFile, 'tweets');
      
      if (!imageUrl) {
        throw new Error('Failed to upload image');
      }
    }
    
    const { data, error } = await supabase
      .from('tweets')
      .insert({
        content,
        author_id: userData.user.id,
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
    throw new Error('Failed to create tweet');
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
    
    const transformedData: TweetWithAuthor[] = data.map((item: any) => ({
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
      author: {
        id: item.author_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        avatar_nft_id: item.avatar_nft_id,
        avatar_nft_chain: item.avatar_nft_chain
      }
    }));
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return [];
  }
}

export async function getUserTweets(
  userId: string, 
  limit = 20, 
  offset = 0, 
  retweetsOnly = false
): Promise<TweetWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_tweets', { 
        user_id: userId,
        limit_count: limit, 
        offset_count: offset 
      });
      
    if (error) {
      console.error(`Error fetching user ${retweetsOnly ? 'retweets' : 'tweets'}:`, error);
      throw error;
    }
    
    const filteredData = retweetsOnly 
      ? data.filter((item: any) => item.is_retweet)
      : data;
    
    const transformedData: TweetWithAuthor[] = filteredData.map((item: any) => ({
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
      author: {
        id: item.author_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        avatar_nft_id: item.avatar_nft_id,
        avatar_nft_chain: item.avatar_nft_chain
      }
    }));
    
    return transformedData;
  } catch (error) {
    console.error(`Failed to fetch user ${retweetsOnly ? 'retweets' : 'tweets'}:`, error);
    return [];
  }
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User must be logged in to like a tweet');
    }
    
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select()
      .match({ 
        user_id: userData.user.id,
        tweet_id: tweetId 
      });
      
    if (checkError) {
      console.error('Error checking like status:', checkError);
      return false;
    }
    
    if (existingLike && existingLike.length > 0) {
      const { error: unlikeError } = await supabase
        .from('likes')
        .delete()
        .match({ 
          user_id: userData.user.id,
          tweet_id: tweetId 
        });
        
      if (unlikeError) {
        console.error('Error unliking tweet:', unlikeError);
        return false;
      }
      
      return true;
    }
    
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
    
    return true;
  } catch (error) {
    console.error('Like action failed:', error);
    return false;
  }
}

export async function retweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User must be logged in to retweet');
    }
    
    const { data: existingRetweet, error: checkError } = await supabase
      .from('retweets')
      .select()
      .match({ 
        user_id: userData.user.id,
        tweet_id: tweetId 
      });
      
    if (checkError) {
      console.error('Error checking retweet status:', checkError);
      return false;
    }
    
    if (existingRetweet && existingRetweet.length > 0) {
      const { error: deleteRetweetError } = await supabase
        .from('retweets')
        .delete()
        .match({ 
          user_id: userData.user.id,
          tweet_id: tweetId 
        });
        
      if (deleteRetweetError) {
        console.error('Error removing retweet record:', deleteRetweetError);
        return false;
      }
      
      const { data: retweetTweet, error: findError } = await supabase
        .from('tweets')
        .select()
        .match({
          author_id: userData.user.id,
          original_tweet_id: tweetId,
          is_retweet: true
        });
        
      if (findError) {
        console.error('Error finding retweet tweet:', findError);
        return false;
      }
      
      if (retweetTweet && retweetTweet.length > 0) {
        const { error: deleteTweetError } = await supabase
          .from('tweets')
          .delete()
          .eq('id', retweetTweet[0].id);
          
        if (deleteTweetError) {
          console.error('Error deleting retweet tweet:', deleteTweetError);
          return false;
        }
      }
      
      return true;
    }
    
    const { error: retweetError } = await supabase
      .from('retweets')
      .insert({
        user_id: userData.user.id,
        tweet_id: tweetId
      });
      
    if (retweetError) {
      console.error('Error creating retweet record:', retweetError);
      return false;
    }
    
    const { error: tweetError } = await supabase
      .from('tweets')
      .insert({
        content: '',
        author_id: userData.user.id,
        is_retweet: true,
        original_tweet_id: tweetId
      });
      
    if (tweetError) {
      console.error('Error creating retweet tweet:', tweetError);
      
      await supabase
        .from('retweets')
        .delete()
        .match({ 
          user_id: userData.user.id,
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
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select()
      .match({ 
        user_id: userData.user.id,
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

export async function checkIfUserRetweetedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('retweets')
      .select()
      .match({ 
        user_id: userData.user.id,
        tweet_id: tweetId 
      });
      
    if (error) {
      console.error('Error checking retweet status:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Check retweet status failed:', error);
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

export async function getOriginalTweet(tweetId: string): Promise<TweetWithAuthor | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_with_author', { tweet_id: tweetId });
      
    if (error) {
      console.error('Error fetching original tweet:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const item = data[0];
    
    const transformedData: TweetWithAuthor = {
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
      author: {
        id: item.author_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        avatar_nft_id: item.avatar_nft_id,
        avatar_nft_chain: item.avatar_nft_chain
      }
    };
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch original tweet:', error);
    return null;
  }
}
