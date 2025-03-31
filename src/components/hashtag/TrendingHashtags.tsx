
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTrendingHashtags } from '@/services/hashtagService';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';

type TrendingHashtag = {
  hashtag_id: string;
  name: string;
  tweet_count: number;
};

export function TrendingHashtags({ limit = 5 }: { limit?: number }) {
  // Use React Query for automatic caching and revalidation
  const { data: hashtags = [], isLoading } = useQuery({
    queryKey: ['trending-hashtags', limit],
    queryFn: () => getTrendingHashtags(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes before refetching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black p-4">
        <div className="flex items-center mb-4">
          <Sparkles className="h-4 w-4 mr-2 text-crypto-blue" />
          <h3 className="font-medium">Trending Hashtags</h3>
        </div>
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="space-y-2 mb-3">
            <Skeleton className="h-4 w-3/4 bg-gray-800" />
            <Skeleton className="h-3 w-1/4 bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black p-4">
        <div className="flex items-center mb-4">
          <Sparkles className="h-4 w-4 mr-2 text-crypto-blue" />
          <h3 className="font-medium">Trending Hashtags</h3>
        </div>
        <p className="text-gray-500 text-sm">No trending hashtags with 15+ tweets found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-black p-4">
      <div className="flex items-center mb-4">
        <Sparkles className="h-4 w-4 mr-2 text-crypto-blue" />
        <h3 className="font-medium">Trending Hashtags</h3>
      </div>
      
      <ul className="space-y-3">
        {hashtags.map((tag) => (
          <li key={tag.hashtag_id}>
            <Link 
              to={`/hashtag/${tag.name}`}
              className="block hover:bg-gray-900 rounded-md transition-colors p-2"
            >
              <div className="text-crypto-blue font-medium">#{tag.name}</div>
              <div className="text-gray-500 text-xs mt-1">
                {tag.tweet_count} {tag.tweet_count === 1 ? 'tweet' : 'tweets'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
