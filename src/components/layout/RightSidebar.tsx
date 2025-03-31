import { Search, TrendingUp, MoreHorizontal, LineChart, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

type UserSuggestion = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_nft_id: string | null;
  avatar_nft_chain: string | null;
};

type SearchResult = UserSuggestion & {
  similarity: number;
};

const RightSidebar = () => {
  const [activeTab, setActiveTab] = useState("stats");
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUserSuggestions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.rpc('get_user_suggestions', {
          current_user_id: user ? user.id : null,
          limit_count: 3
        });
        
        if (error) {
          console.error('Error fetching user suggestions:', error);
          throw error;
        }
        
        setUserSuggestions(data || []);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        toast({
          title: "Failed to load suggestions",
          description: "Could not load user suggestions. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserSuggestions();
    
    const intervalId = setInterval(fetchUserSuggestions, 1800000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user, toast]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        setIsSearching(true);
        const { data, error } = await supabase.rpc('search_users', {
          search_term: searchTerm,
          limit_count: 10
        });
        
        if (error) {
          console.error('Error searching users:', error);
          throw error;
        }
        
        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          title: "Search failed",
          description: "Could not search for users. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm, toast]);

  const generateAvatarPlaceholder = (name: string | null) => {
    if (!name) return "U";
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const navigateToProfile = (username: string | null) => {
    if (username) {
      navigate(`/profile/${username}`);
      clearSearch();
    } else {
      toast({
        title: "Profile not found",
        description: "This user doesn't have a username set.",
        variant: "destructive"
      });
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
  };
  
  return (
    <div className="hidden lg:block w-80 min-w-80 max-w-[400px] border-l border-crypto-gray/30 h-screen sticky top-0">
      <ScrollArea className="h-screen">
        <div className="p-4">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-crypto-lightgray" />
            </div>
            <Input 
              className="pl-10 pr-10 bg-crypto-darkgray border-crypto-gray rounded-full text-sm py-5"
              placeholder="Search for users by @username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <button 
                  onClick={clearSearch}
                  className="text-crypto-lightgray hover:text-crypto-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {showSearchResults && (
              <div className="absolute mt-1 w-full bg-crypto-black border border-crypto-gray rounded-lg shadow-lg py-2 z-20">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <div className="animate-pulse text-crypto-lightgray">Searching...</div>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div 
                      key={result.id} 
                      className="px-4 py-2 hover:bg-crypto-darkgray cursor-pointer"
                      onClick={() => navigateToProfile(result.username)}
                    >
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 border border-crypto-gray">
                          <AvatarImage src={result.avatar_url || ''} alt={result.display_name || 'User'} />
                          <AvatarFallback>{generateAvatarPlaceholder(result.display_name)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="font-medium text-crypto-text text-sm">{result.display_name || 'Unnamed User'}</p>
                          <p className="text-xs text-crypto-lightgray">@{result.username || 'user'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-crypto-lightgray text-center">
                    No users found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Tabs defaultValue="stats" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 bg-crypto-darkgray/70 rounded-xl p-1">
              <TabsTrigger 
                value="stats" 
                className="rounded-lg data-[state=active]:bg-crypto-blue/20 data-[state=active]:text-crypto-blue"
              >
                <LineChart className="h-4 w-4 mr-1" />
                <span className="text-xs">Stats</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trends" 
                className="rounded-lg data-[state=active]:bg-crypto-blue/20 data-[state=active]:text-crypto-blue"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs">Trends</span>
              </TabsTrigger>
              <TabsTrigger 
                value="follow" 
                className="rounded-lg data-[state=active]:bg-crypto-blue/20 data-[state=active]:text-crypto-blue"
              >
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs">Follow</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="sidebar-content-container pb-10">
              <TabsContent value="stats" className="mt-0 space-y-4">
                <MarketStats />
                <NewsSection compact={true} />
              </TabsContent>
              
              <TabsContent value="trends" className="mt-0">
                <TrendingTopics />
              </TabsContent>
              
              <TabsContent value="follow" className="mt-0">
                <Card className="bg-crypto-black border-crypto-gray">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-xl">Who to follow</h2>
                      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {isLoading ? (
                        Array(3).fill(0).map((_, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-crypto-darkgray animate-pulse"></div>
                              <div className="ml-3">
                                <div className="h-4 w-24 bg-crypto-darkgray rounded animate-pulse"></div>
                                <div className="h-3 w-16 bg-crypto-darkgray rounded animate-pulse mt-2"></div>
                              </div>
                            </div>
                            <div className="h-8 w-16 bg-crypto-darkgray rounded-full animate-pulse"></div>
                          </div>
                        ))
                      ) : userSuggestions.length > 0 ? (
                        userSuggestions.map((profile) => (
                          <div key={profile.id} className="flex items-center justify-between">
                            <div 
                              className="flex items-center cursor-pointer" 
                              onClick={() => navigateToProfile(profile.username)}
                            >
                              <Avatar className="h-10 w-10 border border-crypto-gray">
                                <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || 'User'} />
                                <AvatarFallback>{generateAvatarPlaceholder(profile.display_name)}</AvatarFallback>
                              </Avatar>
                              <div className="ml-3">
                                <p className="font-medium text-crypto-text hover:underline">{profile.display_name || 'Unnamed User'}</p>
                                <p className="text-xs text-crypto-lightgray">@{profile.username || 'user'}</p>
                              </div>
                            </div>
                            <Button 
                              className="bg-white hover:bg-gray-200 text-black rounded-full text-xs py-1 px-3 h-8 font-bold"
                              onClick={() => {
                                if (!user) {
                                  toast({
                                    title: "Authentication Required",
                                    description: "You need to be logged in to follow users",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                toast({
                                  title: "Follow request",
                                  description: "Follow functionality will be implemented soon",
                                });
                              }}
                            >
                              Follow
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-crypto-lightgray">
                          <p>No suggestions available</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      className="text-crypto-blue text-sm hover:bg-crypto-blue/10 mt-4 w-full justify-start px-3"
                      onClick={() => {
                        setActiveTab("follow");
                        const fetchSuggestions = async () => {
                          try {
                            setIsLoading(true);
                            const { data, error } = await supabase.rpc('get_user_suggestions', {
                              current_user_id: user ? user.id : null,
                              limit_count: 3
                            });
                            
                            if (error) throw error;
                            setUserSuggestions(data || []);
                          } catch (error) {
                            toast({
                              title: "Failed to refresh suggestions",
                              description: "Could not load user suggestions. Please try again later.",
                              variant: "destructive"
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        };
                        fetchSuggestions();
                      }}
                    >
                      Show more
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RightSidebar;
