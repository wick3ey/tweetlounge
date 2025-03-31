
import { supabase } from '@/lib/supabase';
import { getCachedData, setCachedData, CACHE_DURATIONS } from '@/utils/cacheService';

/**
 * Save hashtags extracted from tweet content and create relations
 */
export async function saveHashtagsForTweet(tweetId: string, hashtags: string[]): Promise<boolean> {
  try {
    if (!hashtags.length) return true;
    
    // Process each hashtag
    for (const tagName of hashtags) {
      // Skip empty tags
      if (!tagName.trim()) continue;
      
      // 1. Insert or get hashtag
      const { data: hashtagData, error: hashtagError } = await supabase
        .from('hashtags')
        .upsert({ name: tagName.toLowerCase() })
        .select('id')
        .single();
      
      if (hashtagError) {
        console.error('Error upserting hashtag:', hashtagError);
        continue;
      }
      
      // 2. Create relation between tweet and hashtag
      if (hashtagData?.id) {
        const { error: relationError } = await supabase
          .from('tweet_hashtags')
          .upsert({
            tweet_id: tweetId,
            hashtag_id: hashtagData.id
          });
        
        if (relationError) {
          console.error('Error creating tweet-hashtag relation:', relationError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving hashtags for tweet:', error);
    return false;
  }
}

/**
 * Get tweets that contain a specific hashtag
 */
export async function getTweetsByHashtag(hashtagName: string, limit = 20, offset = 0): Promise<any[]> {
  try {
    // Check cache first
    const cacheKey = `hashtag-tweets:${hashtagName}:${limit}:${offset}`;
    const cachedData = await getCachedData<any[]>(cacheKey);
    
    if (cachedData) {
      console.log('Using cached hashtag tweets data');
      return cachedData;
    }
    
    // First find the hashtag ID
    const { data: hashtag, error: hashtagError } = await supabase
      .from('hashtags')
      .select('id')
      .eq('name', hashtagName.toLowerCase())
      .single();
    
    if (hashtagError || !hashtag) {
      console.error('Hashtag not found:', hashtagError);
      return [];
    }
    
    // Get tweet IDs related to this hashtag
    const { data: relations, error: relationsError } = await supabase
      .from('tweet_hashtags')
      .select('tweet_id')
      .eq('hashtag_id', hashtag.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (relationsError || !relations.length) {
      console.error('No tweet relations found:', relationsError);
      return [];
    }
    
    // Get the actual tweets
    const tweetIds = relations.map(rel => rel.tweet_id);
    const { data: tweets, error: tweetsError } = await supabase
      .rpc('get_tweets_with_authors_reliable', { 
        limit_count: limit, 
        offset_count: 0 
      });
    
    if (tweetsError) {
      console.error('Error fetching tweets:', tweetsError);
      return [];
    }
    
    // Filter to only include tweets in our ID list
    const filteredTweets = (tweets || []).filter(tweet => 
      tweetIds.includes(tweet.id)
    );
    
    // Cache the result
    await setCachedData(cacheKey, filteredTweets, CACHE_DURATIONS.SHORT);
    
    return filteredTweets;
  } catch (error) {
    console.error('Error getting tweets by hashtag:', error);
    return [];
  }
}

/**
 * Get trending hashtags with more than 15 tweets, sorted by count
 */
export async function getTrendingHashtags(limit = 5): Promise<any[]> {
  try {
    // Check cache first
    const cacheKey = `trending-hashtags:${limit}`;
    const cachedData = await getCachedData<any[]>(cacheKey);
    
    if (cachedData) {
      console.log('Using cached trending hashtags data');
      return cachedData;
    }
    
    const { data, error } = await supabase
      .rpc('get_trending_hashtags', { limit_count: limit });
    
    if (error) {
      console.error('Error fetching trending hashtags:', error);
      return [];
    }
    
    // Filter hashtags with more than 15 tweets
    const filteredHashtags = (data || []).filter(tag => tag.tweet_count >= 15);
    
    // Sort by tweet count (highest first)
    filteredHashtags.sort((a, b) => b.tweet_count - a.tweet_count);
    
    // Cache the result
    await setCachedData(cacheKey, filteredHashtags, CACHE_DURATIONS.MEDIUM);
    
    return filteredHashtags;
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    return [];
  }
}
