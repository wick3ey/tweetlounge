
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import TweetComposer from '@/components/tweet/TweetComposer';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  // For demonstration, generate mock tweets with the current user
  useEffect(() => {
    const generateMockTweets = () => {
      if (!user || !profile) return;

      // Mock data for demonstration
      const mockTweets: TweetWithAuthor[] = [
        {
          id: '1',
          content: 'Just learned how to build a Twitter clone with React and Supabase! #webdev #react',
          author_id: user.id,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          likes_count: 24,
          retweets_count: 5,
          replies_count: 3,
          is_retweet: false,
          author: {
            id: user.id,
            username: profile.username || user.email?.split('@')[0] || '',
            display_name: profile.display_name || user.email?.split('@')[0] || '',
            avatar_url: profile.avatar_url || '',
          },
        },
        {
          id: '2',
          content: 'Supabase makes building backend functionality so easy! Highly recommended for your next project.',
          author_id: user.id,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          likes_count: 42,
          retweets_count: 10,
          replies_count: 7,
          is_retweet: false,
          author: {
            id: user.id,
            username: profile.username || user.email?.split('@')[0] || '',
            display_name: profile.display_name || user.email?.split('@')[0] || '',
            avatar_url: profile.avatar_url || '',
          },
        },
        {
          id: '3',
          content: 'Working on adding real-time updates to this Twitter clone. Stay tuned! #coding',
          author_id: user.id,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          likes_count: 18,
          retweets_count: 2,
          replies_count: 1,
          is_retweet: false,
          image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
          author: {
            id: user.id,
            username: profile.username || user.email?.split('@')[0] || '',
            display_name: profile.display_name || user.email?.split('@')[0] || '',
            avatar_url: profile.avatar_url || '',
          },
        },
      ];

      setTweets(mockTweets);
      setLoading(false);
    };

    if (user && profile) {
      generateMockTweets();
    }
  }, [user, profile]);

  const handlePostTweet = async (content: string, imageFile?: File) => {
    if (!user || !profile) return;

    try {
      // For demonstration, add tweet to local state
      // In a real app, this would save to Supabase
      const newTweet: TweetWithAuthor = {
        id: `temp-${Date.now()}`,
        content,
        author_id: user.id,
        created_at: new Date().toISOString(),
        likes_count: 0,
        retweets_count: 0,
        replies_count: 0,
        is_retweet: false,
        author: {
          id: user.id,
          username: profile.username || user.email?.split('@')[0] || '',
          display_name: profile.display_name || user.email?.split('@')[0] || '',
          avatar_url: profile.avatar_url || '',
        }
      };

      // If an image was included
      if (imageFile) {
        // In a real app, upload to Supabase storage
        // For now, create an object URL for demonstration
        newTweet.image_url = URL.createObjectURL(imageFile);
      }

      setTweets([newTweet, ...tweets]);
      
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast({
        variant: "destructive",
        title: "Failed to post tweet",
        description: "There was an error posting your tweet. Please try again."
      });
    }
  };

  return (
    <div className="flex bg-white">
      <LeftSidebar />
      
      <main className="flex-1 border-x border-gray-200 min-h-screen">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Home</h1>
        </div>
        
        {user && <TweetComposer onTweetSubmit={handlePostTweet} />}
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
            </div>
          ) : (
            tweets.map((tweet) => (
              <TweetCard 
                key={tweet.id} 
                tweet={tweet} 
              />
            ))
          )}
        </div>
      </main>
      
      <RightSidebar />
    </div>
  );
};

export default Home;
