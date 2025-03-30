
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoButton } from "@/components/ui/crypto-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsData, formatNewsDate, type NewsArticle } from '@/utils/newsService';
import { AlertTriangle, ExternalLink, Loader2, Newspaper, TrendingUp, Tag, Clock, RotateCw, MessageSquare, Calendar, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// Enhanced news item component with animations and interactive elements
const NewsItem: React.FC<{ 
  article: NewsArticle; 
  expanded: boolean; 
  onClick: () => void;
  highlightColor: string;
}> = ({ article, expanded, onClick, highlightColor }) => {
  const formattedDate = formatNewsDate(article.published_at);
  const [isHovered, setIsHovered] = useState(false);
  
  // Dynamic badge color based on currency
  const getCurrencyColor = (code: string) => {
    switch(code) {
      case 'BTC': return 'bg-amber-500/20 text-amber-400'; 
      case 'ETH': return 'bg-purple-500/20 text-purple-400';
      case 'SOL': return 'bg-green-500/20 text-green-400';
      default: return 'bg-crypto-blue/20 text-crypto-blue';
    }
  };
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`group block p-3 border-b border-crypto-gray ${expanded ? 'bg-crypto-gray/10' : ''} hover:bg-crypto-gray/10 transition-all rounded-md cursor-pointer`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered ? `inset 0 0 0 1px ${highlightColor}33, 0 4px 12px -2px rgba(0,0,0,0.3)` : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className={`font-medium text-sm text-white group-hover:text-${highlightColor.replace('#', '')} transition-colors leading-tight ${expanded ? 'line-clamp-none' : 'line-clamp-2'}`}>
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
                className={`${getCurrencyColor(currency.code)} text-[10px] px-2 py-0.5 rounded-full flex items-center`}
              >
                {currency.code}
              </span>
            ))}
            
            {article.votes && (
              <div className="flex gap-1 ml-auto">
                <TooltipProvider>
                  {article.votes.positive > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="bg-crypto-green/20 text-crypto-green text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                          <ThumbsUp className="w-2 h-2 mr-0.5" /> {article.votes.positive}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {article.votes.positive} positive votes
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {article.votes.negative > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="bg-crypto-red/20 text-crypto-red text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                          <ThumbsDown className="w-2 h-2 mr-0.5" /> {article.votes.negative}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {article.votes.negative} negative votes
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {article.votes.important > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="bg-crypto-blue/20 text-crypto-blue text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                          <Star className="w-2 h-2 mr-0.5" /> {article.votes.important}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {article.votes.important} marked as important
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            )}
          </div>
          
          {expanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex justify-between items-center"
            >
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="flex items-center gap-1 hover:bg-crypto-gray/20">
                  <Calendar className="h-3 w-3" />
                  {new Date(article.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Badge>
                
                {article.votes?.comments > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 hover:bg-crypto-gray/20">
                    <MessageSquare className="h-3 w-3" />
                    {article.votes.comments}
                  </Badge>
                )}
              </div>
              
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-crypto-blue hover:underline flex items-center"
              >
                Read more <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </motion.div>
          )}
        </div>
        <div className={`p-1.5 rounded-full transition-colors ${expanded ? `bg-${highlightColor.replace('#', '')}/20` : 'bg-crypto-darkgray group-hover:bg-crypto-blue/20'}`}>
          <ExternalLink className={`w-3.5 h-3.5 ${expanded ? `text-${highlightColor.replace('#', '')}` : 'text-crypto-lightgray group-hover:text-crypto-blue'} transition-colors`} />
        </div>
      </div>
    </motion.div>
  );
};

// Loading skeleton for news items
const NewsItemSkeleton: React.FC = () => (
  <div className="p-4 border-b border-crypto-gray">
    <div className="flex justify-between items-start">
      <div className="flex-1 pr-3">
        <Skeleton className="h-4 w-full mb-2 bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
        <Skeleton className="h-4 w-3/4 mb-3 bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
        
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
            <Skeleton className="h-3 w-16 bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
            <Skeleton className="h-3 w-20 bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
          </div>
        </div>
        
        <div className="flex space-x-2 mt-2">
          <Skeleton className="h-4 w-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
          <Skeleton className="h-4 w-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
          <Skeleton className="h-4 w-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
        </div>
      </div>
      <Skeleton className="h-6 w-6 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 animate-shimmer" />
    </div>
  </div>
);

interface NewsSectionProps {
  compact?: boolean;
}

const NewsSection: React.FC<NewsSectionProps> = ({ compact = false }) => {
  const { newsArticles, loading, error, isRefreshing, refreshData } = useNewsData();
  const [expandedArticleId, setExpandedArticleId] = useState<number | null>(null);
  const [highlightColor, setHighlightColor] = useState('#1d9bf0'); // crypto-blue by default
  
  // Array of highlight colors to cycle through
  const highlightColors = [
    '#1d9bf0', // crypto-blue
    '#8b5cf6', // purple
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#6366f1', // indigo
    '#ec4899', // pink
  ];
  
  // Cycle through highlight colors on interval
  useEffect(() => {
    if (!compact) {
      const intervalId = setInterval(() => {
        setHighlightColor(prevColor => {
          const currentIndex = highlightColors.indexOf(prevColor);
          const nextIndex = (currentIndex + 1) % highlightColors.length;
          return highlightColors[nextIndex];
        });
      }, 8000);
      
      return () => clearInterval(intervalId);
    }
  }, [compact]);
  
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
  
  // Notify when new content is available
  useEffect(() => {
    if (isRefreshing) {
      toast({
        title: "Updating News",
        description: "Fetching latest crypto headlines...",
      });
    }
  }, [isRefreshing]);
  
  const handleRefresh = async () => {
    toast({
      title: "Refreshing News",
      description: "Fetching latest crypto headlines...",
    });
    
    await refreshData();
    
    toast({
      title: "News Updated",
      description: "News data has been refreshed.",
    });
  };

  const toggleExpandArticle = (articleId: number) => {
    setExpandedArticleId(expandedArticleId === articleId ? null : articleId);
  };

  return (
    <Card 
      className={`crypto-news-card border-crypto-gray shadow-md overflow-hidden bg-gradient-to-br from-black to-gray-900`}
      style={{ borderImage: `linear-gradient(to right, ${highlightColor}33, transparent) 1` }}
    >
      <CardHeader className="pb-2 border-b border-crypto-gray">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="w-5 h-5 mr-2 rounded-full flex items-center justify-center" 
              style={{ 
                background: `linear-gradient(135deg, ${highlightColor}, ${highlightColor}80)`,
                boxShadow: `0 0 10px ${highlightColor}33`
              }}
            >
              <Newspaper className="w-3 h-3 text-white" />
            </div>
            <CardTitle className="text-base font-display text-gradient-primary">Latest News</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CryptoButton variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7" aria-label="Refresh news">
              <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </CryptoButton>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs" style={{ background: `${highlightColor}20`, color: highlightColor }} className="rounded-full px-2 py-0.5">
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
                        <span className="mr-1">Auto-updating</span>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: highlightColor }}></div>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {loading ? "Fetching latest headlines..." : 
                   error ? "Unable to load news. Will retry soon." : 
                   "News updates automatically every 30 minutes"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className={compact ? "h-[300px]" : "h-[500px]"}>
            {loading ? (
              // Loading skeletons
              Array(compact ? 3 : 5).fill(0).map((_, index) => (
                <NewsItemSkeleton key={index} />
              ))
            ) : newsArticles.length === 0 ? (
              // Empty state
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.5 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}
                >
                  <AlertTriangle className="h-8 w-8 text-crypto-lightgray mx-auto mb-2 opacity-50" />
                </motion.div>
                <p className="text-crypto-lightgray text-sm mb-2">No recent news available</p>
                <p className="text-xs text-crypto-lightgray/70 mb-3">We'll display news as soon as they're published</p>
              </div>
            ) : (
              // Articles
              <div className="p-2 space-y-1">
                <AnimatePresence>
                  {newsArticles.slice(0, compact ? 4 : newsArticles.length).map((article) => (
                    <NewsItem 
                      key={article.id} 
                      article={article} 
                      expanded={expandedArticleId === article.id}
                      onClick={() => toggleExpandArticle(article.id)}
                      highlightColor={highlightColor}
                    />
                  ))}
                </AnimatePresence>
                
                {!compact && (
                  <motion.div 
                    className="p-3 flex justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <a 
                      href="https://cryptopanic.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full"
                    >
                      <CryptoButton 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-crypto-blue/10 w-full"
                        style={{ color: highlightColor, borderColor: `${highlightColor}33` }}
                      >
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                        View All Crypto News
                      </CryptoButton>
                    </a>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSection;
