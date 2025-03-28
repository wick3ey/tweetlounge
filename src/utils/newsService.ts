
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// News article interface
export interface NewsArticle {
  id: number;
  title: string;
  published_at: string;
  url: string;
  source: {
    title: string;
    domain: string;
  };
  currencies: Array<{
    code: string;
    title: string;
    slug: string;
  }>;
  votes: {
    negative: number;
    positive: number;
    important: number;
    liked: number;
    disliked: number;
    lol: number;
    toxic: number;
    saved: number;
    comments: number;
  };
}

interface CryptoPanicResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NewsArticle[];
}

// API constants
const API_BASE_URL = 'https://cryptopanic.com/api/v1';
const AUTH_TOKEN = 'f722edf22e486537391c7a517320e54f7ed4b38b';
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// CORS proxy URL - Using allorigins
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * Fetches news from CryptoPanic API through a CORS proxy
 * Including BTC, ETH, SOL, and general crypto news
 */
const fetchNews = async (): Promise<NewsArticle[]> => {
  console.info('Fetching fresh crypto news');
  
  try {
    // Using AllOrigins CORS proxy
    // Modified parameters: removed filter=hot to get newest news, added "sort=published_at"
    // to ensure most recent news first
    const targetUrl = `${API_BASE_URL}/posts/?auth_token=${AUTH_TOKEN}&currencies=BTC,ETH,SOL&public=true&kind=news&regions=en&sort=published_at`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl, {
      // Added cache control to avoid browser caching
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Skip cache option
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.status}`);
    }
    
    // AllOrigins wraps the response in a "contents" field as a string
    const data = await response.json();
    
    // Parse the contents string as JSON to get the actual API response
    const parsedContents: CryptoPanicResponse = JSON.parse(data.contents);
    
    // Double-check sorting by published date to ensure latest news first 
    // (in case API sort parameter doesn't work)
    return parsedContents.results.sort((a, b) => {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
};

/**
 * Hook for fetching and managing crypto news
 * Auto-refreshes every 30 minutes
 */
export const useNewsData = () => {
  const { 
    data: newsArticles = [], 
    isLoading: loading, 
    error,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ['cryptoNews'],
    queryFn: fetchNews,
    refetchInterval: REFRESH_INTERVAL,
    // Reduced stale time to refresh data more often
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2, // Only retry twice before showing error
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });
  
  return {
    newsArticles,
    loading,
    error: error ? (error instanceof Error ? error.message : "Unknown error") : null,
    isRefreshing: isRefetching,
    refetch
  };
};

/**
 * Format a date string into a more readable format
 */
export const formatNewsDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMilliseconds / (1000 * 60));
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInHours / 24);
    if (days < 7) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
};
