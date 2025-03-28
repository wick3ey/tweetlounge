
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import TweetComposer from "@/components/tweet/TweetComposer";
import TweetCard from "@/components/tweet/TweetCard";
import { TweetWithAuthor } from "@/types/Tweet";
import { Loader, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

const Home = () => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mockTweets: TweetWithAuthor[] = [
      {
        id: "1",
        content: "Just setting up my Twitter clone!",
        author_id: "1",
        created_at: new Date().toISOString(),
        likes_count: 5,
        retweets_count: 2,
        replies_count: 1,
        is_retweet: false,
        author: {
          id: "1",
          username: "eljasbou",
          display_name: "Eljas B",
          avatar_url: "https://avatars.githubusercontent.com/u/12345678?v=4"
        }
      },
      {
        id: "2",
        content: "This is an amazing Twitter clone built with React and Supabase!",
        author_id: "2",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        likes_count: 10,
        retweets_count: 3,
        replies_count: 2,
        is_retweet: false,
        author: {
          id: "2",
          username: "techguru",
          display_name: "Tech Guru",
          avatar_url: "https://i.pravatar.cc/150?img=2"
        }
      },
      {
        id: "3",
        content: "Exploring the potential of web development with modern tools!",
        author_id: "3",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        likes_count: 15,
        retweets_count: 5,
        replies_count: 3,
        is_retweet: false,
        author: {
          id: "3",
          username: "webdev",
          display_name: "Web Developer",
          avatar_url: "https://i.pravatar.cc/150?img=3"
        }
      }
    ];

    setTimeout(() => {
      setTweets(mockTweets);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleTweetSubmit = async (content: string, imageFile?: File) => {
    if (!user) return;
    
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
        username: user.email?.split('@')[0] || 'user',
        display_name: user.email?.split('@')[0] || 'User',
        avatar_url: "https://i.pravatar.cc/150?img=1"
      }
    };

    setTweets([newTweet, ...tweets]);
    
    return Promise.resolve();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background bg-mesh-gradient">
        <div className="container mx-auto flex">
          <LeftSidebar />

          <main className="flex-1 min-h-screen border-x border-border/30">
            <div className="p-4 backdrop-blur-sm border-b border-border/30 sticky top-0 z-10 bg-background/70">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-bold">Home</h1>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="border-b border-border/30 bg-card/20">
              <TweetComposer onTweetSubmit={handleTweetSubmit} placeholder="What's happening?" />
            </div>

            <div className="divide-y divide-border/30">
              {isLoading ? (
                <div className="flex justify-center items-center p-10">
                  <div className="glass-card p-8 flex flex-col items-center">
                    <Loader className="w-8 h-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">Loading tweets...</p>
                  </div>
                </div>
              ) : (
                tweets.map((tweet) => (
                  <div key={tweet.id} className="hover:bg-card/20 transition-colors">
                    <TweetCard tweet={tweet} />
                  </div>
                ))
              )}
            </div>
          </main>

          <RightSidebar />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Home;
