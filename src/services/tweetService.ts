
import { supabase } from '@/lib/supabase';
import { Tweet, TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { createNotification, deleteNotification } from './notificationService';

export async function createTweet(content: string, imageFile?: File): Promise<Tweet | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to create a tweet');
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
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
      console.error('Error creating tweet:', error);
      throw error;
    }
    
    return data as Tweet;
  } catch (error) {
    console.error('Tweet creation failed:', error);
    return null;
  }
}

export async function getTweets(limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  try {
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
    
    const transformedData: TweetWithAuthor[] = await Promise.all((data as any[]).map(async (item: any) => {
      const isRetweet = item.is_retweet && item.original_tweet_id;
      
      const tweetData: TweetWithAuthor = {
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
        profile_username: item.profile_username,
        profile_display_name: item.profile_display_name,
        profile_avatar_url: item.profile_avatar_url,
        profile_avatar_nft_id: item.profile_avatar_nft_id,
        profile_avatar_nft_chain: item.profile_avatar_nft_chain,
        author: {
          id: item.author_id,
          username: item.profile_username || '',
          display_name: item.profile_display_name || '',
          avatar_url: item.profile_avatar_url || '',
          avatar_nft_id: item.profile_avatar_nft_id,
          avatar_nft_chain: item.profile_avatar_nft_chain
        }
      };
      
      if (isRetweet) {
        try {
          const { data: originalTweetData } = await supabase
            .from('tweets')
            .select(`
              id,
              content,
              image_url,
              author_id,
              profiles:author_id (
                id,
                username,
                display_name,
                avatar_url,
                avatar_nft_id,
                avatar_nft_chain
              )
            `)
            .eq('id', item.original_tweet_id)
            .single();
            
          if (originalTweetData && originalTweetData.profiles) {
            // Fix: Access the profiles data correctly
            // The profiles property could be an object (single profile) or an array (multiple profiles)
            const profileData = originalTweetData.profiles;
            
            tweetData.original_author = {
              id: originalTweetData.author_id,
              username: profileData.username || '',
              display_name: profileData.display_name || '',
              avatar_url: profileData.avatar_url || '',
              avatar_nft_id: profileData.avatar_nft_id,
              avatar_nft_chain: profileData.avatar_nft_chain
            };
            
            tweetData.content = originalTweetData.content;
            tweetData.image_url = originalTweetData.image_url;
          }
        } catch (err) {
          console.error('Error fetching original tweet data:', err);
        }
      }
      
      return tweetData;
    }));
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return [];
  }
}

export async function getUserTweets(userId: string, limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
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
    
    const { data: existingRetweet } = await supabase
      .from('retweets')
      .select('*')
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId)
      .maybeSingle();
    
    const { data: tweet } = await supabase
      .from('tweets')
      .select('author_id, content, image_url, retweets_count')
      .eq('id', tweetId)
      .single();
    
    if (existingRetweet) {
      const { error: deleteError } = await supabase
        .from('retweets')
        .delete()
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId);
      
      if (deleteError) {
        console.error('Error deleting retweet:', deleteError);
        throw deleteError;
      }
      
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
      
      const { error: createTweetError } = await supabase
        .from('tweets')
        .insert({
          author_id: user.id,
          content: tweet.content,
          is_retweet: true,
          original_tweet_id: tweetId,
          image_url: tweet.image_url
        });
      
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
      
      await createNotification(tweet.author_id, user.id, 'retweet', tweetId);
      
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
    
    const { data: tweet } = await supabase
      .from('tweets')
      .select('author_id, replies_count')
      .eq('id', tweetId)
      .single();
    
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
    
    if (tweet) {
      const newCount = (tweet.replies_count || 0) + 1;
      await supabase
        .from('tweets')
        .update({ replies_count: newCount })
        .eq('id', tweetId);
    }
    
    await createNotification(tweet.author_id, user.id, 'comment', tweetId);
    
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
        profile_username: tweet.profiles.username,
        profile_display_name: tweet.profiles.display_name,
        profile_avatar_url: tweet.profiles.avatar_url,
        profile_avatar_nft_id: tweet.profiles.avatar_nft_id,
        profile_avatar_nft_chain: tweet.profiles.avatar_nft_chain,
        author: {
          id: tweet.author_id,
          username: tweet.profiles.username,
          display_name: tweet.profiles.display_name,
          avatar_url: tweet.profiles.avatar_url || '',
          avatar_nft_id: tweet.profiles.avatar_nft_id,
          avatar_nft_chain: tweet.profiles.avatar_nft_chain
        }
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
    }
    
    const { error: likesDeleteError } = await supabase
      .from('likes')
      .delete()
      .eq('tweet_id', tweetId);
      
    if (likesDeleteError) {
      console.error('Error deleting related likes:', likesDeleteError);
    }
    
    const { error: retweetsDeleteError } = await supabase
      .from('retweets')
      .delete()
      .eq('tweet_id', tweetId);
      
    if (retweetsDeleteError) {
      console.error('Error deleting related retweets:', retweetsDeleteError);
    }
    
    const { error: deleteError } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);
      
    if (deleteError) {
      console.error('Error deleting tweet:', deleteError);
      throw deleteError;
    }
    
    return true;
  } catch (error) {
    console.error('Tweet deletion failed:', error);
    return false;
  }
}
