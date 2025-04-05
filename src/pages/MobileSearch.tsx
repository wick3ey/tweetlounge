
import React, { useState, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, X, TrendingUp, User, MessageCircle, ArrowUpRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCryptoData } from '@/utils/coingeckoService';
import { useNewsData } from '@/utils/newsService';

const MobileSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [tweets, setTweets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    '#Bitcoin', '#Ethereum', '#Solana', '#DeFi', '#NFT', 
    '#Web3', '#Metaverse', '#Trading', '#Crypto', '#Blockchain'
  ]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { cryptoData } = useCryptoData();
  const { newsArticles } = useNewsData();
  
  useEffect(() => {
    if (searchQuery.trim()) {
      const delaySearch = setTimeout(() => {
        search();
      }, 500);
      return () => clearTimeout(delaySearch);
    }
  }, [searchQuery]);

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
      
      setUsers(userData || []);
      setTweets(tweetData || []);
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
  
  const handleClearSearch = () => {
    setSearchQuery('');
    setUsers([]);
    setTweets([]);
  };
  
  // This component should only render on mobile devices
  if (!isMobile) {
    return null;
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const renderTrendingContent = () => {
    const trendingNews = newsArticles?.slice(0, 5) || [];
    
    return (
      <div className="pb-16">
        <div className="px-4 pt-2 pb-3">
          <h2 className="text-xl font-bold text-white">Explore</h2>
        </div>
        
        <Tabs defaultValue="foryou" className="w-full">
          <div className="border-b border-gray-800 px-4">
            <TabsList className="flex space-x-6 overflow-x-auto scrollbar-none bg-transparent p-0">
              <TabsTrigger 
                value="foryou" 
                className="text-sm px-0 py-3 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-400 bg-transparent"
              >
                For You
              </TabsTrigger>
              <TabsTrigger 
                value="trending" 
                className="text-sm px-0 py-3 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-400 bg-transparent"
              >
                Trending
              </TabsTrigger>
              <TabsTrigger 
                value="news" 
                className="text-sm px-0 py-3 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-400 bg-transparent"
              >
                News
              </TabsTrigger>
              <TabsTrigger 
                value="sports" 
                className="text-sm px-0 py-3 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-400 bg-transparent"
              >
                Sports
              </TabsTrigger>
              <TabsTrigger 
                value="entertainment" 
                className="text-sm px-0 py-3 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-400 bg-transparent"
              >
                Entertainment
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="foryou" className="mt-0">
            <div className="p-4">
              <h3 className="font-bold text-xl text-white mb-2">Today's News</h3>
            </div>
            
            {trendingNews.map((news, index) => (
              <div key={index} className="border-b border-gray-800 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <span>Trending now</span>
                      <span className="mx-1">•</span>
                      <span>{news.source?.title || 'News'}</span>
                    </div>
                    <h4 className="font-bold text-white mb-1">{news.title}</h4>
                    <div className="text-xs text-gray-500">
                      {news.currencies?.length > 0 ? `${news.currencies[0].code} • ` : ''}
                      {news.votes?.positive || 0}K posts
                    </div>
                  </div>
                  {news.image && (
                    <div className="ml-3 w-16 h-16">
                      <img 
                        src={news.image} 
                        alt={news.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="p-4">
              <h3 className="font-bold text-xl text-white mb-3">Trending in crypto</h3>
              <div className="space-y-4">
                {trendingTopics.slice(0, 5).map((topic, index) => (
                  <div key={index} className="hover:bg-gray-900/30 rounded-lg py-1 px-2 cursor-pointer">
                    <div className="text-xs text-gray-500 mb-1">Trending</div>
                    <div className="font-bold text-white">{topic}</div>
                    <div className="text-xs text-gray-500">{Math.floor(Math.random() * 100) + 10}K posts</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="trending" className="mt-0">
            <div className="p-4">
              <h3 className="font-bold text-xl text-white mb-3">Trending now</h3>
            </div>
            
            {trendingTopics.map((topic, index) => (
              <div key={index} className="border-b border-gray-800 p-4">
                <div className="text-xs text-gray-500 mb-1">Trending in Crypto</div>
                <div className="font-bold text-white">{topic}</div>
                <div className="text-xs text-gray-500">{Math.floor(Math.random() * 100) + 10}K posts</div>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="news" className="mt-0">
            <div className="p-4">
              <h3 className="font-bold text-xl text-white mb-2">Latest News</h3>
            </div>
            
            {newsArticles?.slice(0, 10).map((news, index) => (
              <div key={index} className="border-b border-gray-800 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <span>{news.source?.title || 'News'}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(news.published_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-white mb-1">{news.title}</h4>
                    <div className="text-xs text-gray-500">
                      {news.currencies?.length > 0 ? `${news.currencies[0].code} • ` : ''}
                      {news.votes?.positive || 0}K posts
                    </div>
                  </div>
                  {news.image && (
                    <div className="ml-3 w-16 h-16">
                      <img 
                        src={news.image} 
                        alt={news.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  };
  
  const renderSearchResults = () => (
    <div className="divide-y divide-gray-800 pb-16">
      {users.length > 0 && activeTab !== 'tweets' && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">People</h3>
          <div className="space-y-3">
            {users.map(user => (
              <motion.div
                key={user.id}
                className="flex items-center justify-between p-2.5 hover:bg-gray-900/30 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-blue-500/20 text-blue-500">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-white">{user.display_name}</div>
                    <div className="text-sm text-gray-500">@{user.username}</div>
                  </div>
                </div>
                
                <div className="border border-gray-700 text-white rounded-full px-3 py-1 text-sm">
                  Follow
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {tweets.length > 0 && activeTab !== 'users' && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Tweets</h3>
          <div className="space-y-3">
            {tweets.map(tweet => (
              <motion.div
                key={tweet.id}
                className="p-3 rounded-lg border border-gray-800 hover:bg-gray-900/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/tweet/${tweet.id}`)}
              >
                <div className="flex items-start">
                  <Avatar className="h-9 w-9 mr-2 mt-0.5">
                    <AvatarImage src={tweet.profiles?.avatar_url} />
                    <AvatarFallback className="bg-blue-500/20 text-blue-500">
                      {tweet.profiles?.username.substring(0, 2).toUpperCase() || 'TX'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-bold text-white text-sm">{tweet.profiles?.display_name}</span>
                        <span className="text-gray-500 text-xs ml-1">@{tweet.profiles?.username}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{formatDate(tweet.created_at)}</span>
                    </div>
                    <p className="text-white text-sm mt-1 line-clamp-2">{tweet.content}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-gray-500 text-xs">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        {tweet.comments_count || 0}
                      </div>
                      <div className="flex items-center text-gray-500 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                        <span className="ml-1">{tweet.likes_count || 0}</span>
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
          <div className="text-gray-500 mb-2">No results found for "{searchQuery}"</div>
          <div className="text-xs text-gray-500">Try different keywords or check your spelling</div>
        </div>
      )}
    </div>
  );

  return (
    <MobileLayout title="Search" showHeader={false} showBottomNav={true}>
      <div className="flex flex-col min-h-full bg-black">
        <div className="p-3 bg-black sticky top-0 z-20 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search Twitter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 py-5 h-10 bg-gray-800 border-none rounded-full placeholder:text-gray-500 text-white"
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
          
          {searchQuery && (
            <div className="flex items-center justify-between mt-3">
              {users.length > 0 || tweets.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="flex bg-transparent p-0 mb-1">
                    <TabsTrigger 
                      value="all" 
                      className="flex-1 text-sm rounded-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:text-gray-500 bg-transparent"
                    >
                      Top
                    </TabsTrigger>
                    <TabsTrigger 
                      value="users" 
                      className="flex-1 text-sm rounded-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:text-gray-500 bg-transparent"
                    >
                      People
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tweets" 
                      className="flex-1 text-sm rounded-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:text-gray-500 bg-transparent"
                    >
                      Tweets
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <span className="text-xs text-gray-500">
                  {isSearching ? 'Searching...' : `${users.length + tweets.length} results`}
                </span>
              )}
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
