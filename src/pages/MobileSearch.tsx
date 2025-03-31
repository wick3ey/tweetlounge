
import React, { useState, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Search, X, TrendingUp, User, MessageSquare, ArrowUpRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCryptoData } from '@/utils/coingeckoService';

type SearchResultUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio?: string;
};

type SearchResultTweet = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  likes_count: number;
  comments_count: number;
};

const MobileSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<SearchResultUser[]>([]);
  const [tweets, setTweets] = useState<SearchResultTweet[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    '#Bitcoin', '#Ethereum', '#Solana', '#DeFi', '#NFT', 
    '#Crypto', '#Web3', '#Metaverse', '#Trading', '#Blockchain'
  ]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { cryptoData } = useCryptoData();
  
  const search = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setTweets([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Search users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (userError) throw userError;
      
      // Search tweets
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select(`
          id, 
          content, 
          created_at, 
          user_id,
          profiles:user_id (username, avatar_url, display_name),
          likes_count,
          comments_count
        `)
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (tweetError) throw tweetError;
      
      // Format tweets data
      const formattedTweets = tweetData.map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        created_at: tweet.created_at,
        user_id: tweet.user_id,
        username: tweet.profiles?.username || 'unknown',
        avatar_url: tweet.profiles?.avatar_url || '',
        display_name: tweet.profiles?.display_name || 'Unknown User',
        likes_count: tweet.likes_count || 0,
        comments_count: tweet.comments_count || 0
      }));
      
      setUsers(userData || []);
      setTweets(formattedTweets || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Could not complete search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        search();
      }
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
  const handleClearSearch = () => {
    setSearchQuery('');
    setUsers([]);
    setTweets([]);
  };
  
  if (!isMobile) {
    return null; // Don't render on non-mobile devices
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const getSearchResultsCount = () => {
    const total = users.length + tweets.length;
    return total === 0 && searchQuery ? 'No results' : 
           total === 0 ? '' : 
           `${total} result${total === 1 ? '' : 's'}`;
  };
  
  const renderSearchResults = () => (
    <div className="divide-y divide-crypto-gray/20">
      {users.length > 0 && activeTab !== 'tweets' && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-crypto-lightgray mb-3">Users</h3>
          <div className="space-y-3">
            {users.map(user => (
              <motion.div
                key={user.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-crypto-gray/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">{user.display_name}</div>
                    <div className="text-sm text-crypto-lightgray">@{user.username}</div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full h-8 text-xs border border-crypto-gray/30"
                >
                  View
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {tweets.length > 0 && activeTab !== 'users' && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-crypto-lightgray mb-3">Tweets</h3>
          <div className="space-y-3">
            {tweets.map(tweet => (
              <motion.div
                key={tweet.id}
                className="p-3 rounded-lg border border-crypto-gray/20 hover:bg-crypto-gray/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/tweet/${tweet.id}`)}
              >
                <div className="flex items-start">
                  <Avatar className="h-9 w-9 mr-2 mt-0.5">
                    <AvatarImage src={tweet.avatar_url} />
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {tweet.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-white text-sm">{tweet.display_name}</span>
                        <span className="text-crypto-lightgray text-xs ml-1">@{tweet.username}</span>
                      </div>
                      <span className="text-crypto-lightgray text-xs">{formatDate(tweet.created_at)}</span>
                    </div>
                    <p className="text-white text-sm mt-1 line-clamp-2">{tweet.content}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-crypto-lightgray text-xs">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        {tweet.comments_count}
                      </div>
                      <div className="flex items-center text-crypto-lightgray text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                        <span className="ml-1">{tweet.likes_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {searchQuery && users.length === 0 && tweets.length === 0 && !isSearching && (
        <div className="p-10 text-center">
          <div className="text-crypto-lightgray mb-2">No results found for "{searchQuery}"</div>
          <div className="text-xs text-crypto-lightgray">Try different keywords or check your spelling</div>
        </div>
      )}
    </div>
  );
  
  const renderTrendingContent = () => (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-crypto-lightgray mb-3">Trending Topics</h3>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic, index) => (
            <Badge
              key={index}
              className="bg-crypto-blue/10 hover:bg-crypto-blue/20 text-crypto-blue border-none cursor-pointer"
              onClick={() => setSearchQuery(topic)}
            >
              {topic}
            </Badge>
          ))}
        </div>
      </div>
      
      <Separator className="my-4 bg-crypto-gray/20" />
      
      <div className="mb-4">
        <h3 className="text-sm font-medium text-crypto-lightgray mb-3">Popular Cryptocurrencies</h3>
        <div className="space-y-2">
          {cryptoData.slice(0, 5).map((crypto, index) => (
            <motion.div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-crypto-gray/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2 bg-crypto-darkgray">
                  <AvatarImage src={crypto.icon} alt={crypto.name} />
                  <AvatarFallback className="bg-crypto-blue/10 text-crypto-blue text-xs">
                    {crypto.symbol.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm text-white">{crypto.symbol}</div>
                  <div className="text-xs text-crypto-lightgray">{crypto.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toFixed(2)}</div>
                <div className={`text-xs ${crypto.change >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <Separator className="my-4 bg-crypto-gray/20" />
      
      <div>
        <h3 className="text-sm font-medium text-crypto-lightgray mb-3">Suggested Users</h3>
        <Card className="bg-crypto-darkgray/50 border-crypto-gray/30">
          <CardContent className="p-3">
            <div className="text-sm text-center text-crypto-lightgray">
              Login to see suggested users based on your interests
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <MobileLayout title="Search" showHeader={true} showBottomNav={true}>
      <div className="flex flex-col min-h-full">
        <div className="p-4 bg-crypto-black sticky top-0 z-20 border-b border-crypto-gray/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crypto-lightgray" />
            <Input
              type="text"
              placeholder="Search tweets, users, crypto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 py-5 h-10 bg-crypto-gray/20 border-crypto-gray/30 rounded-full placeholder:text-crypto-lightgray/70"
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-crypto-gray/30 flex items-center justify-center"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
          
          {searchQuery && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-crypto-lightgray">
                {isSearching ? 'Searching...' : getSearchResultsCount()}
              </span>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-7 p-1 bg-crypto-darkgray/80">
                  <TabsTrigger value="all" className="text-[10px] h-5 px-2">All</TabsTrigger>
                  <TabsTrigger value="users" className="text-[10px] h-5 px-2">Users</TabsTrigger>
                  <TabsTrigger value="tweets" className="text-[10px] h-5 px-2">Tweets</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          {searchQuery ? renderSearchResults() : renderTrendingContent()}
        </ScrollArea>
      </div>
    </MobileLayout>
  );
};

export default MobileSearch;
