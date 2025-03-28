
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoButton } from "@/components/ui/crypto-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsData, formatNewsDate, type NewsArticle } from '@/utils/newsService';
import { AlertTriangle, ExternalLink, Loader2, Newspaper, RefreshCw, Rss } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Component for a single news article
const NewsItem: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const formattedDate = formatNewsDate(article.published_at);
  
  return (
    <a 
      href={article.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block p-3 border-b border-crypto-gray hover:bg-crypto-gray/10 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-3">
          <h3 className="font-medium text-xs text-white mb-1 line-clamp-2">
            {article.title}
          </h3>
          <div className="flex items-center text-xs text-crypto-lightgray">
            <span className="mr-2 text-[10px]">{article.source.title}</span>
            <span className="text-[10px]">{formattedDate}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {article.currencies.slice(0, 2).map((currency) => (
              <span 
                key={currency.code} 
                className="bg-crypto-blue/20 text-crypto-blue text-[10px] px-1.5 py-0.5 rounded-full"
              >
                {currency.code}
              </span>
            ))}
          </div>
        </div>
        <ExternalLink className="w-3 h-3 text-crypto-lightgray shrink-0" />
      </div>
    </a>
  );
};

// Loading skeleton for news items
const NewsItemSkeleton: React.FC = () => (
  <div className="p-3 border-b border-crypto-gray">
    <div className="flex justify-between items-start">
      <div className="flex-1 pr-3">
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4 mb-2" />
        <div className="flex items-center space-x-2 mt-1">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-16" />
        </div>
        <div className="flex space-x-1 mt-1">
          <Skeleton className="h-4 w-8 rounded-full" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-3 rounded" />
    </div>
  </div>
);

const NewsSection: React.FC = () => {
  const { newsArticles, loading, error, refreshData, isRefreshing } = useNewsData();
  
  // Display error toast if needed
  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading News",
        description: error,
        variant: "destructive"
      });
    }
  }, [error]);
  
  const handleRefresh = async () => {
    toast({
      title: "Refreshing News",
      description: "Fetching latest crypto news...",
    });
    
    await refreshData();
  };

  return (
    <Card className="crypto-news-card mt-4 bg-crypto-black border-crypto-gray">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Newspaper className="w-5 h-5 text-crypto-blue mr-2" />
            <CardTitle className="text-base font-display">Latest News</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CryptoButton variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7" aria-label="Refresh news">
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </CryptoButton>
            
            <div className="flex items-center text-xs bg-crypto-blue/20 text-crypto-blue rounded-full px-2 py-0.5">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Loading
                </span>
              ) : error ? (
                <span className="flex items-center text-crypto-red">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Error
                </span>
              ) : (
                <>
                  <span className="mr-1">Live</span>
                  <div className="w-2 h-2 rounded-full bg-crypto-blue animate-pulse"></div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <Alert variant="destructive" className="mx-4 my-3 bg-crypto-black border-crypto-red text-crypto-red">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error fetching news</AlertTitle>
            <AlertDescription className="text-sm">
              Unable to load news from CryptoPanic API.
              <div className="mt-2">
                <CryptoButton 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  className="border-crypto-red text-crypto-red hover:bg-crypto-red/10"
                >
                  Try Again
                </CryptoButton>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              // Loading skeletons
              Array(4).fill(0).map((_, index) => (
                <NewsItemSkeleton key={index} />
              ))
            ) : newsArticles.length === 0 ? (
              // Empty state
              <div className="p-4 text-center">
                <Rss className="h-6 w-6 text-crypto-lightgray mx-auto mb-2" />
                <p className="text-crypto-lightgray text-sm">No news available</p>
                <CryptoButton 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={handleRefresh}
                >
                  Refresh
                </CryptoButton>
              </div>
            ) : (
              // Articles
              newsArticles.slice(0, 6).map((article) => (
                <NewsItem key={article.id} article={article} />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSection;
