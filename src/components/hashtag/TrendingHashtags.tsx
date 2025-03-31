
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTrendingHashtags } from '@/services/hashtagService';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TrendingHashtag = {
  hashtag_id: string;
  name: string;
  tweet_count: number;
};

export function TrendingHashtags({ limit = 5 }: { limit?: number }) {
  // Use React Query for automatic caching and revalidation
  const { 
    data: hashtags = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['trending-hashtags', limit],
    queryFn: () => getTrendingHashtags(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes before refetching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Listen for changes to hashtags or tweets that might affect trending hashtags
  useEffect(() => {
    const hashtagsChannel = supabase
      .channel('realtime:trending-hashtags')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweet_hashtags'
      }, () => {
        console.log('Detected hashtag change, refreshing trending hashtags');
        refetch();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tweets'
      }, () => {
        console.log('Detected new tweet, refreshing trending hashtags');
        refetch();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(hashtagsChannel);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div>
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="py-3 space-y-1 hover:bg-gray-800/50 transition-colors px-3">
            <Skeleton className="h-3 w-24 bg-gray-800" />
            <Skeleton className="h-4 w-40 bg-gray-800" />
            <Skeleton className="h-3 w-16 bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="py-3 px-3">
        <p className="text-gray-500 text-sm">No trending hashtags with 15+ tweets found.</p>
      </div>
    );
  }

  return (
    <div>
      {hashtags.map((tag) => (
        <Link 
          key={tag.hashtag_id}
          to={`/hashtag/${tag.name}`}
          className="block hover:bg-gray-800/50 transition-colors py-3 px-3"
        >
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Trending in Crypto</span>
            <span className="font-bold text-white">#{tag.name}</span>
            <span className="text-xs text-gray-500">{tag.tweet_count} {tag.tweet_count === 1 ? 'tweet' : 'tweets'}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
