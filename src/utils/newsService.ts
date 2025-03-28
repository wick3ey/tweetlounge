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

// Alternative CORS proxies - we'll try multiple in case one fails
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/',
  'https://cors-anywhere.herokuapp.com/'
];

/**
 * Fetches news from CryptoPanic API through a CORS proxy
 * Only showing news from the past 3 hours for BTC, ETH, SOL and general crypto
 */
const fetchNews = async (): Promise<NewsArticle[]> => {
  console.info('Fetching fresh crypto news');
  
  // Setting up API call to get the latest news, sorted by date (newer first)
  const targetUrl = `${API_BASE_URL}/posts/?auth_token=${AUTH_TOKEN}&currencies=BTC,ETH,SOL&public=true&kind=news&regions=en`;
  
  // Try each proxy in sequence until one works
  let error = null;
  for (const proxy of CORS_PROXIES) {
    try {
      // Adding cache-busting parameter to ensure we get fresh content
      const requestUrl = `${proxy}${encodeURIComponent(targetUrl)}&_=${new Date().getTime()}`;
      
      const response = await fetch(requestUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      // Parse the response based on which proxy we're using
      let parsedContents: CryptoPanicResponse;
      
      if (proxy.includes('allorigins')) {
        // AllOrigins wraps the response in a "contents" field as a string
        const data = await response.json();
        parsedContents = JSON.parse(data.contents);
      } else {
        // Other proxies likely return the data directly
        parsedContents = await response.json();
      }
      
      // Filter news to only show the last 3 hours
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
      
      const recentNews = parsedContents.results.filter(article => {
        const publishDate = new Date(article.published_at);
        return publishDate >= threeHoursAgo;
      });
      
      // If no recent news in the last 3 hours, return the most recent 10 articles
      if (recentNews.length === 0) {
        console.info('No news in the last 3 hours, showing the most recent 10 articles');
        return parsedContents.results.slice(0, 10);
      }
      
      console.info(`Found ${recentNews.length} news articles from the last 3 hours`);
      return recentNews;
    } catch (proxyError) {
      console.error(`Error with proxy ${proxy}:`, proxyError);
      error = proxyError;
      // Continue to the next proxy
    }
  }
  
  // If all proxies failed, throw the last error
  console.error('All CORS proxies failed');
  throw error || new Error('Failed to fetch news from all available proxies');
};

/**
 * Hook for fetching and managing crypto news
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
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry three times before showing error
    refetchOnWindowFocus: true, // Refresh when tab becomes active
  });
  
  return {
    newsArticles,
    loading,
    error: error ? (error instanceof Error ? error.message : "Unknown error") : null,
    isRefreshing: isRefetching
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
