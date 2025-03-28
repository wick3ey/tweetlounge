
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoButton } from "@/components/ui/crypto-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsData, formatNewsDate, type NewsArticle } from '@/utils/newsService';
import { AlertTriangle, ArrowUpRight, Loader2, Newspaper, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

// Component for a single news article
const NewsItem: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const formattedDate = formatNewsDate(article.published_at);
  
  return (
    <a 
      href={article.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block p-4 border-b border-crypto-gray hover:bg-crypto-gray/10 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <h3 className="font-medium text-sm text-white mb-1 line-clamp-2">
            {article.title}
          </h3>
          <div className="flex items-center text-xs text-crypto-lightgray">
            <span className="mr-2">{article.source.title}</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex space-x-1 mt-2">
            {article.currencies.map((currency) => (
              <span 
                key={currency.code} 
                className="bg-crypto-blue/20 text-crypto-blue text-xs px-2 py-0.5 rounded-full"
              >
                {currency.code}
              </span>
            ))}
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-crypto-lightgray shrink-0" />
      </div>
    </a>
  );
};

// Loading skeleton for news items
const NewsItemSkeleton: React.FC = () => (
  <div className="p-4 border-b border-crypto-gray">
    <div className="flex justify-between items-start">
      <div className="flex-1 pr-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex items-center space-x-2 mt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex space-x-1 mt-2">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded" />
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
    <Card className="crypto-news-card mt-4 mb-4">
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
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, index) => (
              <NewsItemSkeleton key={index} />
            ))
          ) : error ? (
            // Error state
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-crypto-red mx-auto mb-2" />
              <p className="text-crypto-lightgray">Failed to load crypto news</p>
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleRefresh}
              >
                Try Again
              </CryptoButton>
            </div>
          ) : newsArticles.length === 0 ? (
            // Empty state
            <div className="p-8 text-center">
              <p className="text-crypto-lightgray">No news articles available</p>
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleRefresh}
              >
                Refresh
              </CryptoButton>
            </div>
          ) : (
            // Articles
            newsArticles.map((article) => (
              <NewsItem key={article.id} article={article} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsSection;
