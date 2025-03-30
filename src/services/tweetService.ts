
export async function getOriginalTweet(originalTweetId: string): Promise<TweetWithAuthor | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_tweet_with_author_reliable', { tweet_id: originalTweetId });

    if (error) {
      console.error('Error fetching original tweet:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const tweetData = data[0];
    
    return {
      id: tweetData.id,
      content: tweetData.content,
      author_id: tweetData.author_id,
      created_at: tweetData.created_at,
      likes_count: tweetData.likes_count,
      retweets_count: tweetData.retweets_count,
      replies_count: tweetData.replies_count,
      is_retweet: tweetData.is_retweet,
      original_tweet_id: tweetData.original_tweet_id,
      image_url: tweetData.image_url,
      author: {
        id: tweetData.author_id,
        username: tweetData.username,
        display_name: tweetData.display_name,
        avatar_url: tweetData.avatar_url || '',
        avatar_nft_id: tweetData.avatar_nft_id,
        avatar_nft_chain: tweetData.avatar_nft_chain
      }
    };
  } catch (error) {
    console.error('Failed to fetch original tweet:', error);
    return null;
  }
}
