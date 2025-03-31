
-- Create an optimized function for efficiently fetching tweets
CREATE OR REPLACE FUNCTION public.get_tweets_optimized(limit_count integer, offset_count integer)
RETURNS TABLE(
  id uuid,
  content text,
  author_id uuid, 
  created_at timestamp with time zone,
  likes_count integer,
  retweets_count integer,
  replies_count integer,
  is_retweet boolean,
  original_tweet_id uuid,
  image_url text,
  username text,
  display_name text,
  avatar_url text,
  avatar_nft_id text,
  avatar_nft_chain text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add an index hint to force using the created_at index for faster sorting
  RETURN QUERY
  SELECT 
    t.id,
    t.content,
    t.author_id,
    t.created_at,
    t.likes_count,
    t.retweets_count,
    t.replies_count,
    t.is_retweet,
    t.original_tweet_id,
    t.image_url,
    p.username,
    p.display_name,
    p.avatar_url,
    p.avatar_nft_id,
    p.avatar_nft_chain
  FROM 
    public.tweets t
  JOIN 
    public.profiles p ON t.author_id = p.id
  ORDER BY 
    t.created_at DESC
  LIMIT 
    limit_count
  OFFSET 
    offset_count;
END;
$$;

-- Create an index on tweets.created_at to optimize the sorting operation
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON public.tweets(created_at DESC);
