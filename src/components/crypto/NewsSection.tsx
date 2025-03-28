
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoButton } from "@/components/ui/crypto-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsData, formatNewsDate, type NewsArticle } from '@/utils/newsService';
import { AlertTriangle, ExternalLink, Loader2, Newspaper, RefreshCw, Rss, TrendingUp, Tag, Clock, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// Component for a single news article with enhanced design
const NewsItem: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const formattedDate = formatNewsDate(article.published_at);
  
  return (
    <a 
      href={article.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="group block p-4 border-b border-crypto-gray hover:bg-crypto-gray/10 transition-colors rounded-md"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-sm text-white group-hover:text-crypto-blue transition-colors line-clamp-2 leading-tight">
            {article.title}
          </h3>
          
          <div className="flex items-center mt-2 text-xs text-crypto-lightgray">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
            <span className="mx-2">•</span>
            <div className="flex items-center">
              <Tag className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[100px]">{article.source.title}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {article.currencies.slice(0, 3).map((currency) => (
              <span 
                key={currency.code} 
                className="bg-crypto-blue/20 text-crypto-blue text-[10px] px-2 py-0.5 rounded-full flex items-center"
              >
                {currency.code}
              </span>
            ))}
            
            {article.votes && (
              <div className="flex gap-1 ml-auto">
                {article.votes.positive > 0 && (
                  <span className="bg-crypto-green/20 text-crypto-green text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                    +{article.votes.positive}
                  </span>
                )}
                {article.votes.negative > 0 && (
                  <span className="bg-crypto-red/20 text-crypto-red text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                    -{article.votes.negative}
                  </span>
                )}
                {article.votes.important > 0 && (
                  <span className="bg-crypto-blue/20 text-crypto-blue text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                    !{article.votes.important}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="bg-crypto-darkgray rounded-full p-1.5 group-hover:bg-crypto-blue/20 transition-colors">
          <ExternalLink className="w-3.5 h-3.5 text-crypto-lightgray group-hover:text-crypto-blue transition-colors" />
        </div>
      </div>
    </a>
  );
};

// Loading skeleton for news items - enhanced with more details
const NewsItemSkeleton: React.FC = () => (
  <div className="p-4 border-b border-crypto-gray">
    <div className="flex justify-between items-start">
      <div className="flex-1 pr-3">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        
        <div className="flex space-x-2 mt-2">
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-6 rounded-full" />
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
    <Card className="crypto-news-card bg-crypto-black border-crypto-gray shadow-md overflow-hidden">
      <CardHeader className="pb-2 border-b border-crypto-gray">
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
          <ScrollArea className="h-[500px]">
            {loading ? (
              // Loading skeletons
              Array(5).fill(0).map((_, index) => (
                <NewsItemSkeleton key={index} />
              ))
            ) : newsArticles.length === 0 ? (
              // Empty state
              <div className="p-6 text-center">
                <Rss className="h-8 w-8 text-crypto-lightgray mx-auto mb-2 opacity-50" />
                <p className="text-crypto-lightgray text-sm mb-2">No news available</p>
                <p className="text-xs text-crypto-lightgray/70 mb-3">Check back later for crypto updates</p>
                <CryptoButton 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleRefresh}
                >
                  Refresh
                </CryptoButton>
              </div>
            ) : (
              // Articles
              <div className="p-2 space-y-1">
                {newsArticles.map((article) => (
                  <NewsItem key={article.id} article={article} />
                ))}
                
                <div className="p-3 flex justify-center">
                  <a 
                    href="https://cryptopanic.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full"
                  >
                    <CryptoButton 
                      variant="ghost" 
                      size="sm" 
                      className="text-crypto-blue hover:text-crypto-blue hover:bg-crypto-blue/10 w-full"
                    >
                      <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                      View All Crypto News
                    </CryptoButton>
                  </a>
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSection;
