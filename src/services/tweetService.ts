import { supabase } from '@/integrations/supabase/client';
import { Tweet, TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { createNotification } from '@/services/notificationService';

export const getTweets = async (limit = 10, offset = 0, userId?: string): Promise<TweetWithAuthor[]> => {
  try {
    let query;
    
    if (userId) {
      // Get tweets by a specific user
      query = supabase
        .from('tweets')
        .select(`
          id,
          content,
          created_at,
          author_id,
          likes_count,
          retweets_count,
          replies_count,
          is_retweet,
          original_tweet_id,
          image_url,
          profiles!tweets_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            avatar_nft_id,
            avatar_nft_chain
          )
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    } else {
      // Get all tweets
      query = supabase
        .rpc('get_tweets_with_author', { 
          limit_val: limit, 
          offset_val: offset 
        });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tweets:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform data to match the TweetWithAuthor type
    const transformedTweets: TweetWithAuthor[] = await Promise.all(data.map(async (tweet: any) => {
      let transformedTweet: TweetWithAuthor = {
        id: tweet.id,
        content: tweet.content,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        likes_count: tweet.likes_count || 0,
        retweets_count: tweet.retweets_count || 0,
        replies_count: tweet.replies_count || 0,
        is_retweet: tweet.is_retweet || false,
        original_tweet_id: tweet.original_tweet_id,
        image_url: tweet.image_url,
        author: {
          id: tweet.profiles?.id || tweet.author_id,
          username: tweet.profiles?.username || tweet.profile_username || '',
          display_name: tweet.profiles?.display_name || tweet.profile_display_name || '',
          avatar_url: tweet.profiles?.avatar_url || tweet.profile_avatar_url || '',
          avatar_nft_id: tweet.profiles?.avatar_nft_id || tweet.profile_avatar_nft_id,
          avatar_nft_chain: tweet.profiles?.avatar_nft_chain || tweet.profile_avatar_nft_chain
        }
      };

      // If this is a retweet, fetch original tweet information
      if (tweet.is_retweet && tweet.original_tweet_id) {
        const { data: originalTweetData, error: originalTweetError } = await supabase
          .from('tweets')
          .select(`
            id, 
            content, 
            image_url,
            profiles!tweets_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              avatar_nft_id,
              avatar_nft_chain
            )
          `)
          .eq('id', tweet.original_tweet_id)
          .single();

        if (!originalTweetError && originalTweetData) {
          // Store original tweet author information
          transformedTweet.original_author = {
            id: originalTweetData.profiles.id,
            username: originalTweetData.profiles.username,
            display_name: originalTweetData.profiles.display_name,
            avatar_url: originalTweetData.profiles.avatar_url,
            avatar_nft_id: originalTweetData.profiles.avatar_nft_id,
            avatar_nft_chain: originalTweetData.profiles.avatar_nft_chain
          };
          
          // Use content and image from the original tweet
          transformedTweet.content = originalTweetData.content;
          transformedTweet.image_url = originalTweetData.image_url;
          
          // Store who retweeted it
          transformedTweet.retweeted_by = {
            id: transformedTweet.author.id,
            username: transformedTweet.author.username || '',
            display_name: transformedTweet.author.display_name || '',
            avatar_url: transformedTweet.author.avatar_url || ''
          };
        }
      }

      return transformedTweet;
    }));

    return transformedTweets;
  } catch (error) {
    console.error('Error in getTweets:', error);
    return [];
  }
};

export const getTweetById = async (tweetId: string): Promise<TweetWithAuthor | null> => {
  try {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        id,
        content,
        created_at,
        author_id,
        likes_count,
        retweets_count,
        replies_count,
        is_retweet,
        original_tweet_id,
        image_url,
        profiles!tweets_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .eq('id', tweetId)
      .single();

    if (error) {
      console.error('Error fetching tweet:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform data to match the TweetWithAuthor type
    const transformedTweet: TweetWithAuthor = {
      id: data.id,
      content: data.content,
      author_id: data.author_id,
      created_at: data.created_at,
      likes_count: data.likes_count || 0,
      retweets_count: data.retweets_count || 0,
      replies_count: data.replies_count || 0,
      is_retweet: data.is_retweet || false,
      original_tweet_id: data.original_tweet_id,
      image_url: data.image_url,
      author: {
        id: data.profiles?.id || data.author_id,
        username: data.profiles?.username || '',
        display_name: data.profiles?.display_name || '',
        avatar_url: data.profiles?.avatar_url || '',
        avatar_nft_id: data.profiles?.avatar_nft_id,
        avatar_nft_chain: data.profiles?.avatar_nft_chain
      }
    };

    return transformedTweet;
  } catch (error) {
    console.error('Error in getTweetById:', error);
    return null;
  }
};

export const createTweet = async (content: string, image_url?: string): Promise<Tweet | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('tweets')
      .insert([
        { content, author_id: userId, image_url: image_url || null }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating tweet:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createTweet:', error);
    return null;
  }
};

export const likeTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return false;
    }

    // First, check if the user has already liked the tweet
    const { data: existingLike, error: existingLikeError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('tweet_id', tweetId)
      .single();

    if (existingLikeError && existingLikeError.code !== 'PGRST116') {
      console.error('Error checking existing like:', existingLikeError);
      return false;
    }

    if (existingLike) {
      // If the user has already liked the tweet, unlike it
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('tweet_id', tweetId);

      if (deleteError) {
        console.error('Error unliking tweet:', deleteError);
        return false;
      }

      // Decrement likes_count in tweets table
      const { error: decrementError } = await supabase
        .from('tweets')
        .update({ likes_count: () => 'likes_count - 1' })
        .eq('id', tweetId);

      if (decrementError) {
        console.error('Error decrementing likes_count:', decrementError);
        return false;
      }
      
      return true;
    } else {
      // If the user has not liked the tweet, like it
      const { error: insertError } = await supabase
        .from('likes')
        .insert([
          { user_id: userId, tweet_id: tweetId }
        ]);

      if (insertError) {
        console.error('Error liking tweet:', insertError);
        return false;
      }

      // Increment likes_count in tweets table
      const { error: incrementError } = await supabase
        .from('tweets')
        .update({ likes_count: () => 'likes_count + 1' })
        .eq('id', tweetId);

      if (incrementError) {
        console.error('Error incrementing likes_count:', incrementError);
        return false;
      }
      
      // Create notification for the tweet author
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select('author_id')
        .eq('id', tweetId)
        .single();

      if (tweetError) {
        console.error('Error fetching tweet author:', tweetError);
        return false;
      }

      if (tweetData && tweetData.author_id !== userId) {
        await createNotification(tweetData.author_id, userId, 'like', tweetId);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error in likeTweet:', error);
    return false;
  }
};

export const checkIfUserLikedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      //console.warn('User not authenticated');
      return false;
    }

    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('tweet_id', tweetId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if user liked tweet:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIfUserLikedTweet:', error);
    return false;
  }
};

export const retweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return false;
    }

    // Check if the user has already retweeted the tweet
    const { data: existingRetweet, error: existingRetweetError } = await supabase
      .from('tweets')
      .select('*')
      .eq('author_id', userId)
      .eq('original_tweet_id', tweetId)
      .eq('is_retweet', true)
      .single();

    if (existingRetweetError && existingRetweetError.code !== 'PGRST116') {
      console.error('Error checking existing retweet:', existingRetweetError);
      return false;
    }

    if (existingRetweet) {
      // If the user has already retweeted the tweet, undo the retweet
      const { error: deleteError } = await supabase
        .from('tweets')
        .delete()
        .eq('author_id', userId)
        .eq('original_tweet_id', tweetId)
        .eq('is_retweet', true);

      if (deleteError) {
        console.error('Error undoing retweet:', deleteError);
        return false;
      }

      // Decrement retweets_count in the original tweet
      const { error: decrementError } = await supabase
        .from('tweets')
        .update({ retweets_count: () => 'retweets_count - 1' })
        .eq('id', tweetId);

      if (decrementError) {
        console.error('Error decrementing retweets_count:', decrementError);
        return false;
      }
      
      return true;
    } else {
      // If the user has not retweeted the tweet, retweet it
      const { data: originalTweet, error: originalTweetError } = await supabase
        .from('tweets')
        .select('author_id')
        .eq('id', tweetId)
        .single();

      if (originalTweetError) {
        console.error('Error fetching original tweet:', originalTweetError);
        return false;
      }

      const { error: insertError } = await supabase
        .from('tweets')
        .insert([
          {
            content: '', // You might want to include some default content or leave it empty
            author_id: userId,
            is_retweet: true,
            original_tweet_id: tweetId
          }
        ]);

      if (insertError) {
        console.error('Error retweeting:', insertError);
        return false;
      }

      // Increment retweets_count in the original tweet
      const { error: incrementError } = await supabase
        .from('tweets')
        .update({ retweets_count: () => 'retweets_count + 1' })
        .eq('id', tweetId);

      if (incrementError) {
        console.error('Error incrementing retweets_count:', incrementError);
        return false;
      }
      
      // Create notification for the tweet author, but only if it's not the same user retweeting their own tweet
      if (originalTweet && originalTweet.author_id !== userId) {
        await createNotification(originalTweet.author_id, userId, 'retweet', tweetId);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error in retweet:', error);
    return false;
  }
};

export const checkIfUserRetweetedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      //console.warn('User not authenticated');
      return false;
    }

    const { data, error } = await supabase
      .from('tweets')
      .select('*')
      .eq('author_id', userId)
      .eq('original_tweet_id', tweetId)
      .eq('is_retweet', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if user retweeted tweet:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIfUserRetweetedTweet:', error);
    return false;
  }
};

export const deleteTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return false;
    }

    // Check if the tweet belongs to the user
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .select('author_id')
      .eq('id', tweetId)
      .single();

    if (tweetError) {
      console.error('Error fetching tweet:', tweetError);
      return false;
    }

    if (!tweetData || tweetData.author_id !== userId) {
      console.warn('User not authorized to delete this tweet');
      return false;
    }

    // Delete the tweet
    const { error: deleteError } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);

    if (deleteError) {
      console.error('Error deleting tweet:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTweet:', error);
    return false;
  }
};

export const updateTweetCounts = async (tweetId: string, likesCount: number, retweetsCount: number, repliesCount: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tweets')
      .update({ likes_count: likesCount, retweets_count: retweetsCount, replies_count: repliesCount })
      .eq('id', tweetId);

    if (error) {
      console.error('Error updating tweet counts:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateTweetCounts:', error);
    return false;
  }
};
