
import React, { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import { ZapIcon, RefreshCwIcon, Menu } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import TweetComposer from '@/components/tweet/TweetComposer'
import TweetFeed from '@/components/tweet/TweetFeed'
import { createTweet } from '@/services/tweetService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs'
import { useIsMobile } from '@/hooks/use-mobile'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainContentLoaded, setMainContentLoaded] = useState(false);
  const [refreshFeed, setRefreshFeed] = useState(0); // Counter to trigger feed refresh

  useEffect(() => {
    // Mark content as loaded after a small delay to ensure proper rendering
    const timer = setTimeout(() => {
      setMainContentLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTweetSubmit = async (content: string, imageFile?: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await createTweet(content, imageFile);
      if (!result) {
        throw new Error("Failed to create tweet");
      }
      
      // Instead of forcing page reload, trigger feed refresh
      setRefreshFeed(prev => prev + 1);
      
      toast({
        title: "Success!",
        description: "Your tweet has been posted",
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast({
        title: "Tweet Error",
        description: "Failed to post your tweet. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleRefresh = () => {
    setRefreshFeed(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-crypto-black crypto-pattern">
      <Header />
      <CryptoTicker />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar for mobile with improved overlay */}
        {isMobile && (
          <>
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-40"
                onClick={toggleSidebar}
              />
            )}
            <LeftSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </>
        )}
        
        {/* Desktop sidebar with better padding */}
        {!isMobile && <LeftSidebar />}
        
        <div className={`flex-1 overflow-y-auto transition-opacity duration-200 ${mainContentLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <main className="max-w-2xl mx-auto px-2 sm:px-4">
            <div className="flex gap-2 sm:gap-3 items-center mb-3 sm:mb-4 mt-2">
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-crypto-gray/20 transition-colors z-10"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
              )}
              <div className="rounded-lg bg-crypto-gray/20 p-1.5">
                <ZapIcon className="text-crypto-blue h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-display font-semibold crypto-gradient-text">Feed</h1>
              
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="ml-auto text-xs h-7 sm:h-8 border-crypto-gray/40 hover:bg-crypto-gray/30"
                onClick={handleRefresh}
              >
                <RefreshCwIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                {!isMobile && "Refresh"}
              </CryptoButton>
            </div>
            
            {user && (
              <div className="mb-3 sm:mb-4">
                <TweetComposer onTweetSubmit={handleTweetSubmit} />
              </div>
            )}
            
            <div className="mb-4">
              <TweetFeedTabs />
              <TweetFeed key={refreshFeed} limit={10} />
            </div>
          </main>
        </div>
        
        {/* Improved RightSidebar visibility */}
        <div className={`hidden lg:block transition-opacity duration-300 ${mainContentLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <RightSidebar />
        </div>
      </div>
    </div>
  )
}

export default Home
