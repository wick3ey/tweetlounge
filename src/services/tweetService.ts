
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
      
      console.log('[tweetService] Original tweet field names:', Object.keys(tweet));
      
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
          username: tweet.username || tweet.profile_username || '',
          display_name: tweet.display_name || tweet.profile_display_name || '',
          avatar_url: tweet.avatar_url || tweet.profile_avatar_url || '',
          avatar_nft_id: tweet.avatar_nft_id || tweet.profile_avatar_nft_id,
          avatar_nft_chain: tweet.avatar_nft_chain || tweet.profile_avatar_nft_chain
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('[tweetService] Failed to fetch original tweet:', error);
    return null;
  }
}
