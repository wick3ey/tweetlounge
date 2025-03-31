
import React, { useState, useEffect, useRef } from 'react';
import { ZapIcon, Bookmark, RefreshCw, BarChart3, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import TweetComposer from '@/components/tweet/TweetComposer';
import TweetFeed from '@/components/tweet/TweetFeed';
import { createTweet } from '@/services/tweetService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { updateTweetCommentCount } from '@/services/commentService';
import MobileLayout from '@/components/layout/MobileLayout';
import { useCryptoData } from '@/utils/coingeckoService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useMarketData } from '@/services/marketService';
import { Badge } from '@/components/ui/badge';
import { useNewsData, formatNewsDate } from '@/utils/newsService';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MobileHome: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const { cryptoData } = useCryptoData();
  const { marketData } = useMarketData();
  const { newsArticles } = useNewsData();
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    isMounted.current = true;
    let pendingRefreshes = 0;

    const debouncedRefresh = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      pendingRefreshes++;
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (pendingRefreshes > 0 && isMounted.current) {
          handleRefresh();
          pendingRefreshes = 0;
        }
      }, 2000);
    };

    const commentsChannel = supabase
      .channel('public:comments:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          
          updateTweetCommentCount(tweetId)
            .catch(err => console.error('Error updating comment count:', err));

          debouncedRefresh();
        }
      })
      .subscribe();
    
    const tweetsChannel = supabase
      .channel('public:tweets:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        debouncedRefresh();
      })
      .subscribe();
      
    return () => {
      isMounted.current = false;
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(tweetsChannel);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleTweetSubmit = async (content: string, imageFile?: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    try {
      const result = await createTweet(content, imageFile);
      if (!result) {
        throw new Error("Failed to create tweet");
      }
      
      if (isMounted.current) {
        setFeedKey(prevKey => prevKey + 1);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error posting tweet:", error);
      if (isMounted.current) {
        toast({
          title: "Tweet Error",
          description: "Failed to post your tweet. Please try again.",
          variant: "destructive"
        });
      }
      throw error;
    }
  };

  const handleRefresh = () => {
    if (isRefreshing || !isMounted.current) return;
    
    setIsRefreshing(true);
    
    setFeedKey(prevKey => prevKey + 1);
    
    setTimeout(() => {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  if (!isMobile) {
    return null;
  }

  const marketChangeColor = (change: number) => change >= 0 ? 'text-crypto-green' : 'text-crypto-red';
  const marketChangeBg = (change: number) => change >= 0 ? 'bg-crypto-green/10' : 'bg-crypto-red/10';
  const marketChangeIcon = (change: number) => change >= 0 ? ArrowUpRight : ArrowUpRight;

  return (
    <MobileLayout title="Home" showHeader={true} showBottomNav={true}>
      <div className="flex flex-col min-h-full">
        {/* New Tabs for Market Content */}
        <Tabs defaultValue="trending" className="w-full" onValueChange={setActiveTab}>
          <div className="sticky top-0 z-20 bg-crypto-black/90 backdrop-blur-sm border-b border-crypto-gray/30">
            <TabsList className="grid grid-cols-3 p-1 m-2 bg-crypto-darkgray/80">
              <TabsTrigger value="trending" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <TrendingUp className="h-3 w-3 mr-1.5 text-crypto-green" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <BarChart3 className="h-3 w-3 mr-1.5 text-crypto-blue" />
                Tokens
              </TabsTrigger>
              <TabsTrigger value="news" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <ZapIcon className="h-3 w-3 mr-1.5 text-amber-400" />
                News
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trending" className="p-0 m-0">
            <div className="px-4 py-3 bg-crypto-darkgray/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-white">Market Highlights</h2>
                <CryptoButton
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate('/market')}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  View All
                </CryptoButton>
              </div>
              
              <ScrollArea className="pb-2">
                <div className="flex space-x-3 pb-2 w-max">
                  {cryptoData.slice(0, 5).map((crypto, index) => (
                    <motion.div 
                      key={index} 
                      className="flex-shrink-0 p-3 glass-card min-w-[140px] border border-crypto-gray/40"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{crypto.symbol}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 ${
                            crypto.change >= 0 ? 'text-crypto-green border-crypto-green/30' : 'text-crypto-red border-crypto-red/30'
                          }`}
                        >
                          {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-crypto-lightgray mb-1">{crypto.name}</div>
                      <div className="text-base font-semibold">${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toFixed(2)}</div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="tokens" className="p-0 m-0">
            <div className="p-4 bg-crypto-darkgray/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">Top Movers</h2>
                <Badge className="bg-crypto-blue/20 text-crypto-blue hover:bg-crypto-blue/30 border-none">
                  24h
                </Badge>
              </div>
              
              <div className="space-y-3">
                {marketData?.gainers?.slice(0, 3).map((token, index) => (
                  <motion.div
                    key={`gainer-${index}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-crypto-gray/20 bg-crypto-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        {token.logoUrl ? (
                          <AvatarImage src={token.logoUrl} alt={token.name} />
                        ) : (
                          <AvatarFallback className="bg-crypto-green/10 text-crypto-green text-xs">
                            {token.symbol.substring(0, 2)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-white">{token.symbol}</div>
                        <div className="text-xs text-crypto-lightgray">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">${token.price < 1 ? token.price.toFixed(4) : token.price.toFixed(2)}</div>
                      <div className="text-xs text-crypto-green">+{token.variation24h.toFixed(2)}%</div>
                    </div>
                  </motion.div>
                ))}
                
                <Separator className="bg-crypto-gray/20 my-3" />
                
                {marketData?.losers?.slice(0, 3).map((token, index) => (
                  <motion.div
                    key={`loser-${index}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-crypto-gray/20 bg-crypto-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        {token.logoUrl ? (
                          <AvatarImage src={token.logoUrl} alt={token.name} />
                        ) : (
                          <AvatarFallback className="bg-crypto-red/10 text-crypto-red text-xs">
                            {token.symbol.substring(0, 2)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-white">{token.symbol}</div>
                        <div className="text-xs text-crypto-lightgray">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">${token.price < 1 ? token.price.toFixed(4) : token.price.toFixed(2)}</div>
                      <div className="text-xs text-crypto-red">{token.variation24h.toFixed(2)}%</div>
                    </div>
                  </motion.div>
                ))}
                
                <div className="flex justify-center mt-3">
                  <CryptoButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-crypto-gray/30"
                    onClick={() => navigate('/market')}
                  >
                    View All Market Data
                  </CryptoButton>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="news" className="p-0 m-0">
            <div className="p-4 bg-crypto-darkgray/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">Latest Crypto News</h2>
                <Badge className="bg-crypto-blue/20 text-crypto-blue hover:bg-crypto-blue/30 border-none" variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Latest
                </Badge>
              </div>
              
              <div className="space-y-3">
                {newsArticles?.slice(0, 3).map((article, index) => (
                  <motion.div
                    key={`news-${index}`}
                    className="p-3 rounded-lg border border-crypto-gray/20 bg-crypto-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-center text-xs text-crypto-lightgray mb-1.5">
                      <Badge variant="outline" className="bg-crypto-darkgray/50 border-crypto-gray/40 mr-2 text-[10px]">
                        {article.source.title}
                      </Badge>
                      <span>{formatNewsDate(article.published_at)}</span>
                    </div>
                    
                    <h3 className="font-medium text-sm text-white line-clamp-2 mb-2">{article.title}</h3>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {article.currencies.slice(0, 3).map((currency, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-crypto-blue/10 text-crypto-blue border-none text-[10px]">
                          {currency.code}
                        </Badge>
                      ))}
                      {article.currencies.length > 3 && (
                        <Badge variant="secondary" className="bg-crypto-gray/20 text-crypto-lightgray border-none text-[10px]">
                          +{article.currencies.length - 3}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                <div className="flex justify-center mt-3">
                  <CryptoButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-crypto-gray/30"
                    onClick={() => navigate('/market')}
                  >
                    Read More News
                  </CryptoButton>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 shrink-0 bg-crypto-black">
          <TweetComposer onTweetSubmit={handleTweetSubmit} />
        </div>
        
        <div className="border-b border-gray-800 shrink-0">
          <TweetFeedTabs />
        </div>
        
        <div className="sticky top-0 z-10 bg-crypto-black/80 backdrop-blur-sm py-2 px-4 border-b border-gray-800/50 flex justify-between items-center">
          <div className="flex items-center">
            <div className="rounded-lg bg-crypto-blue/10 p-1 mr-2">
              <ZapIcon className="text-crypto-blue h-4 w-4" />
            </div>
            <h2 className="text-sm font-medium text-white">Latest Tweets</h2>
          </div>
          
          <CryptoButton 
            variant="outline" 
            size="sm" 
            className={`text-xs h-7 border-gray-800 hover:bg-gray-900 hover:border-gray-700 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </CryptoButton>
        </div>
        
        <div className="flex-1">
          <TweetFeed key={feedKey} onCommentAdded={handleRefresh} />
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileHome;
