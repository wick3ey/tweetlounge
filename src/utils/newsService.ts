
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
 * Only showing news from the past 3 hours for BTC, ETH, SOL and general crypto
 */
const fetchNews = async (): Promise<NewsArticle[]> => {
  console.info('Fetching fresh crypto news');
  
  try {
    // Setting up API call to get the latest news, sorted by date (newer first)
    const targetUrl = `${API_BASE_URL}/posts/?auth_token=${AUTH_TOKEN}&currencies=BTC,ETH,SOL&public=true&kind=news&regions=en`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    
    // Adding cache-busting parameter to ensure we get fresh content
    const requestUrl = `${proxyUrl}&_cacheBust=${new Date().getTime()}`;
    
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
    
    // AllOrigins wraps the response in a "contents" field as a string
    const data = await response.json();
    
    // Parse the contents string as JSON to get the actual API response
    const parsedContents: CryptoPanicResponse = JSON.parse(data.contents);
    
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
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
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
    retry: 2, // Only retry twice before showing error
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
