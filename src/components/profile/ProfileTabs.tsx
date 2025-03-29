
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserTweets, getUserRetweets } from '@/services/tweetService';
import { getUserComments } from '@/services/commentService';
import { TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { Loader, MessageSquare, Reply, FileImage, Coins, Sparkles } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import TweetCard from '@/components/tweet/TweetCard';
import CommentCard from '@/components/comment/CommentCard';
import WalletAssets from '@/components/profile/WalletAssets';
import { useToast } from '@/components/ui/use-toast';

interface ProfileTabsProps {
  userId: string;
  isCurrentUser: boolean;
  solanaAddress: string | null;
}

const ProfileTabs = ({ userId, isCurrentUser, solanaAddress }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [mediaTweets, setMediaTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        if (activeTab === 'posts') {
          const fetchedTweets = await getUserTweets(userId);
          setTweets(fetchedTweets);
        } else if (activeTab === 'replies') {
          const fetchedReplies = await getUserComments(userId);
          setReplies(fetchedReplies);
        } else if (activeTab === 'media') {
          const fetchedTweets = await getUserTweets(userId);
          const tweetsWithMedia = fetchedTweets.filter(tweet => tweet.image_url);
          setMediaTweets(tweetsWithMedia);
        }
      } catch (error) {
        console.error(`Error fetching ${activeTab}:`, error);
        toast({
          title: "Error",
          description: `Failed to load ${activeTab}. Please try again.`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [userId, activeTab, toast]);
  
  const handleRefresh = async () => {
    try {
      setLoading(true);
      if (activeTab === 'posts') {
        const freshTweets = await getUserTweets(userId);
        setTweets(freshTweets);
      } else if (activeTab === 'replies') {
        const freshReplies = await getUserComments(userId);
        setReplies(freshReplies);
      } else if (activeTab === 'media') {
        const freshTweets = await getUserTweets(userId);
        const tweetsWithMedia = freshTweets.filter(tweet => tweet.image_url);
        setMediaTweets(tweetsWithMedia);
      }
    } catch (error) {
      console.error(`Error refreshing ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="border-b border-crypto-gray">
      <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="w-full flex justify-between bg-transparent border-b border-crypto-gray px-0 h-auto">
          <TabsTrigger 
            value="posts" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <MessageSquare className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="replies" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <Reply className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Replies</span>
          </TabsTrigger>
          <TabsTrigger 
            value="media" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <FileImage className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assets" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <Coins className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-0 pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : tweets.length > 0 ? (
            <div className="space-y-4">
              {tweets.map((tweet) => (
                <TweetCard 
                  key={tweet.id} 
                  tweet={tweet} 
                  onAction={handleRefresh}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <div className="text-xl font-bold mb-2 text-crypto-text">No posts yet</div>
                <p className="text-crypto-lightgray text-center mb-6">When you post, your tweets will show up here</p>
                {isCurrentUser && (
                  <CryptoButton className="px-6 py-2">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create your first post
                  </CryptoButton>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="replies" className="mt-0 pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : replies.length > 0 ? (
            <div className="space-y-4">
              {replies.map((reply) => (
                <CommentCard 
                  key={reply.id} 
                  comment={reply} 
                  onAction={handleRefresh}
                  tweetId={reply.tweet_id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Reply className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No replies yet</div>
                <p className="text-crypto-lightgray text-center">When you reply to someone, it will show up here</p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="media" className="mt-0 pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : mediaTweets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {mediaTweets.map((tweet) => (
                <div key={tweet.id} className="bg-crypto-darkgray border border-crypto-gray rounded-xl overflow-hidden">
                  {tweet.image_url && (
                    <img 
                      src={tweet.image_url} 
                      alt="Tweet media" 
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-sm text-crypto-lightgray line-clamp-2">{tweet.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <FileImage className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No media yet</div>
                <p className="text-crypto-lightgray text-center">When you post photos or videos, they will show up here</p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="assets" className="mt-0 pt-4">
          {solanaAddress ? (
            <div className="px-4">
              <div className="mb-4">
                <h2 className="font-bold text-lg text-crypto-blue">Wallet Assets</h2>
              </div>
              <WalletAssets solanaAddress={solanaAddress} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Coins className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No wallet connected</div>
                <p className="text-crypto-lightgray text-center mb-4">Connect your Solana wallet to view your assets</p>
                {isCurrentUser && (
                  <CryptoButton 
                    variant="outline" 
                    className="group border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text"
                    onClick={() => toast({
                      title: "Connect Wallet",
                      description: "Please connect your Solana wallet in the profile section above.",
                    })}
                  >
                    <Coins className="h-4 w-4 mr-2 group-hover:text-crypto-blue" />
                    Connect Solana Wallet
                  </CryptoButton>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileTabs;
