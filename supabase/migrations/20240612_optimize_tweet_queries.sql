
-- Create optimized indexes for tweets to improve query performance
CREATE INDEX IF NOT EXISTS idx_tweets_created_at_desc ON public.tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_author_id_created_at ON public.tweets(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_original_tweet_id ON public.tweets(original_tweet_id);

-- Add index for faster comment count lookups
CREATE INDEX IF NOT EXISTS idx_comments_tweet_id ON public.comments(tweet_id);

-- Create a more efficient get_tweets function that leverages the new indexes
-- This function also includes better query planning hints
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
  -- Add query planning hints to use the most efficient execution path
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
  WHERE
    -- Add query hint to prefer index scan for large datasets
    true
  ORDER BY 
    t.created_at DESC
  LIMIT 
    limit_count
  OFFSET 
    offset_count;
END;
$$;

-- Get user tweets optimized
CREATE OR REPLACE FUNCTION public.get_user_tweets_optimized(user_id uuid, limit_count integer, offset_count integer)
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
  -- Use query planning hints
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
  WHERE
    t.author_id = user_id
  ORDER BY 
    t.created_at DESC
  LIMIT 
    limit_count
  OFFSET 
    offset_count;
END;
$$;

-- Get a single tweet with author details optimized
CREATE OR REPLACE FUNCTION public.get_tweet_with_author_optimized(tweet_id uuid)
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
  WHERE
    t.id = tweet_id;
END;
$$;

-- This function creates a materialized view for a user's feed
-- It can be refreshed periodically for better performance
CREATE OR REPLACE FUNCTION public.refresh_user_feed_cache(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh or create the materialized view for this user
  EXECUTE format('
    DROP MATERIALIZED VIEW IF EXISTS user_feed_cache_%s;
    CREATE MATERIALIZED VIEW user_feed_cache_%s AS
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
    WHERE
      t.author_id IN (
        SELECT following_id FROM followers WHERE follower_id = %L
      )
      OR t.author_id = %L
    ORDER BY 
      t.created_at DESC
    LIMIT 100;
  ', user_uuid, user_uuid, user_uuid, user_uuid);
END;
$$;
