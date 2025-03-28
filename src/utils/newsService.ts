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
const MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute - minimum time between refresh attempts

// CORS proxies - we'll try multiple in case one fails
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest='
];

// Global cache for news data
const newsCache = {
  data: [] as NewsArticle[],
  timestamp: 0,
  isLoading: false,
  lastError: null as string | null
};

/**
 * Fetches news from CryptoPanic API through a CORS proxy
 * Only showing news from the past 3 hours for BTC, ETH, SOL and general crypto
 */
const fetchNews = async (): Promise<NewsArticle[]> => {
  // If another component is already fetching, wait for it to complete
  if (newsCache.isLoading) {
    console.log('Another component is already fetching news, waiting...');
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!newsCache.isLoading) {
          clearInterval(checkInterval);
          if (newsCache.lastError) {
            reject(new Error(newsCache.lastError));
          } else {
            resolve(newsCache.data);
          }
        }
      }, 100);
    });
  }
  
  // Set loading flag to prevent duplicate requests
  newsCache.isLoading = true;
  newsCache.lastError = null;
  
  console.info('Fetching fresh crypto news');
  
  // Setting up API call to get the latest news, sorted by date (newer first)
  const targetUrl = `${API_BASE_URL}/posts/?auth_token=${AUTH_TOKEN}&currencies=BTC,ETH,SOL&public=true&kind=news&regions=en`;
  
  // Try each proxy in sequence until one works
  let error = null;
  for (const proxy of CORS_PROXIES) {
    try {
      // Adding cache-busting parameter to ensure we get fresh content
      const requestUrl = `${proxy}${encodeURIComponent(targetUrl)}&_=${new Date().getTime()}`;
      
      const response = await fetch(requestUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      // Parse the response
      const parsedContents: CryptoPanicResponse = await response.json();
      
      // Filter news to only show the last 3 hours
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
      
      const recentNews = parsedContents.results.filter(article => {
        const publishDate = new Date(article.published_at);
        return publishDate >= threeHoursAgo;
      });
      
      // Update cache
      let resultArticles;
      
      // If no recent news in the last 3 hours, return the most recent 10 articles
      if (recentNews.length === 0) {
        console.info('No news in the last 3 hours, showing the most recent 10 articles');
        resultArticles = parsedContents.results.slice(0, 10);
      } else {
        console.info(`Found ${recentNews.length} news articles from the last 3 hours`);
        resultArticles = recentNews;
      }
      
      // Update the global cache
      newsCache.data = resultArticles;
      newsCache.timestamp = Date.now();
      newsCache.lastError = null;
      
      return resultArticles;
    } catch (proxyError) {
      console.error(`Error with proxy ${proxy}:`, proxyError);
      error = proxyError;
      // Continue to the next proxy
    }
  }
  
  // If all proxies failed, update cache with error
  console.error('All CORS proxies failed');
  newsCache.lastError = error ? 
    (error instanceof Error ? error.message : String(error)) : 
    'Failed to fetch news from all available proxies';
  
  throw error || new Error('Failed to fetch news from all available proxies');
} finally {
  // Always reset loading flag
  newsCache.isLoading = false;
}

/**
 * Hook for fetching and managing crypto news
 */
export const useNewsData = () => {
  // Use React Query with shared cache options
  const { 
    data: newsArticles = [], 
    isLoading: loading, 
    error,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ['cryptoNews'],
    queryFn: async () => {
      // Check if cache is still valid
      const currentTime = Date.now();
      if (newsCache.data.length > 0 && currentTime - newsCache.timestamp < REFRESH_INTERVAL) {
        console.log('Using cached news data');
        return newsCache.data;
      }
      
      // Otherwise fetch fresh data
      return await fetchNews();
    },
    refetchInterval: REFRESH_INTERVAL,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry twice before showing error
    refetchOnWindowFocus: true, // Refresh when tab becomes active
    initialData: newsCache.data.length > 0 ? newsCache.data : undefined,
  });
  
  // Manual refresh function with rate limiting
  const manualRefresh = async () => {
    const currentTime = Date.now();
    
    // Rate limit refreshes to prevent API spam
    if (currentTime - newsCache.timestamp < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - using cached news data');
      return;
    }
    
    // Otherwise refetch
    return refetch();
  };
  
  return {
    newsArticles,
    loading,
    error: error ? (error instanceof Error ? error.message : "Unknown error") : null,
    isRefreshing: isRefetching,
    refreshData: manualRefresh
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
