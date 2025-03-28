import React from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import MarketStats from '@/components/crypto/MarketStats'
import NewsSection from '@/components/crypto/NewsSection'
import { ZapIcon, RefreshCwIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import { Separator } from '@/components/ui/separator'
import TweetComposer from '@/components/tweet/TweetComposer'
import TweetFeed from '@/components/tweet/TweetFeed'
import { createTweet } from '@/services/tweetService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

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
      
      window.location.reload();
      
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

  return (
    <div className="flex flex-col h-screen bg-crypto-black crypto-pattern">
      <Header />
      <CryptoTicker />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto">
          <main className="max-w-xl mx-auto px-2 md:px-4">
            <div className="flex gap-3 items-center mb-4">
              <div className="rounded-lg bg-crypto-gray/20 p-1.5">
                <ZapIcon className="text-crypto-blue h-5 w-5" />
              </div>
              <h1 className="text-xl font-display font-semibold crypto-gradient-text">Feed</h1>
              
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="ml-auto text-xs h-8 border-crypto-gray/40 hover:bg-crypto-gray/30"
                onClick={() => window.location.reload()}
              >
                <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </CryptoButton>
            </div>
            
            <div className="mb-4">
              <TweetComposer onTweetSubmit={handleTweetSubmit} />
            </div>
            
            <div>
              <TweetFeedTabs />
              <TweetFeed limit={10} />
            </div>
          </main>
        </div>
        
        <div className="w-80 overflow-y-auto border-l border-crypto-gray/40 p-4 hidden lg:block">
          <MarketStats />
          <Separator className="my-4 bg-crypto-gray/20" />
          <NewsSection />
        </div>
      </div>
    </div>
  )
}

export default Home
