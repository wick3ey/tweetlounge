import { Search, TrendingUp, MoreHorizontal, LineChart, Newspaper, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Link, useNavigate } from 'react-router-dom';

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
    <div className="hidden lg:block w-80 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input 
            className="pl-10 pr-10 bg-gray-900 border-gray-800 rounded-full text-sm py-5"
            placeholder="Search for users by @username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button 
                onClick={clearSearch}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {showSearchResults && (
            <div className="absolute mt-1 w-full bg-black border border-gray-800 rounded-lg shadow-lg py-2 z-20">
              {isSearching ? (
                <div className="p-4 text-center">
                  <div className="animate-pulse text-gray-500">Searching...</div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div 
                    key={result.id} 
                    className="px-4 py-2 hover:bg-gray-900 cursor-pointer"
                    onClick={() => navigateToProfile(result.username)}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 border border-gray-800">
                        <AvatarImage src={result.avatar_url || ''} alt={result.display_name || 'User'} />
                        <AvatarFallback>{generateAvatarPlaceholder(result.display_name)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <p className="font-medium text-white text-sm">{result.display_name || 'Unnamed User'}</p>
                        <p className="text-xs text-gray-500">@{result.username || 'user'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-center">
                  No users found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
        
        <Tabs defaultValue="stats" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 bg-gray-900/70 rounded-xl p-1">
            <TabsTrigger 
              value="stats" 
              className="rounded-lg data-[state=active]:bg-crypto-blue/20 data-[state=active]:text-crypto-blue"
            >
              <LineChart className="h-4 w-4 mr-1" />
              <span className="text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="news" 
              className="rounded-lg data-[state=active]:bg-crypto-blue/20 data-[state=active]:text-crypto-blue"
            >
              <Newspaper className="h-4 w-4 mr-1" />
              <span className="text-xs">News</span>
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
          
          <div className="sidebar-content-container">
            <TabsContent value="stats" className="mt-0">
              <MarketStats />
              <div className="mt-4">
                <NewsSection compact={true} />
              </div>
            </TabsContent>
            
            <TabsContent value="news" className="mt-0">
              <NewsSection compact={false} />
            </TabsContent>
            
            <TabsContent value="trends" className="mt-0">
              <TrendingTopics />
            </TabsContent>
            
            <TabsContent value="follow" className="mt-0">
              <Card className="bg-black border-gray-800">
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
                            <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse"></div>
                            <div className="ml-3">
                              <div className="h-4 w-24 bg-gray-800 rounded animate-pulse"></div>
                              <div className="h-3 w-16 bg-gray-800 rounded animate-pulse mt-2"></div>
                            </div>
                          </div>
                          <div className="h-8 w-16 bg-gray-800 rounded-full animate-pulse"></div>
                        </div>
                      ))
                    ) : userSuggestions.length > 0 ? (
                      userSuggestions.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between">
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => navigateToProfile(profile.username)}
                          >
                            <Avatar className="h-10 w-10 border border-gray-800">
                              <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || 'User'} />
                              <AvatarFallback>{generateAvatarPlaceholder(profile.display_name)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <p className="font-medium text-white hover:underline">{profile.display_name || 'Unnamed User'}</p>
                              <p className="text-xs text-gray-500">@{profile.username || 'user'}</p>
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
                      <div className="text-center py-4 text-gray-500">
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
    </div>
  );
};

export default RightSidebar;
