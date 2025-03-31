
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Hash } from 'lucide-react';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import TweetCard from '@/components/tweet/TweetCard';
import { getTweetsByHashtag } from '@/services/hashtagService';
import { TweetWithAuthor } from '@/types/Tweet';

const HashtagPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTweets = async () => {
      if (!name) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const fetchedTweets = await getTweetsByHashtag(name);
        setTweets(fetchedTweets);
      } catch (err) {
        console.error('Failed to fetch tweets for hashtag:', err);
        setError('Failed to load tweets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, [name]);

  return (
    <div className="flex flex-col h-screen bg-black">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        
        <div className="flex-1 border-x border-gray-800 overflow-y-auto">
          <main className="max-w-xl mx-auto">
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <div className="flex gap-3 items-center">
                <div className="rounded-lg bg-crypto-blue/10 p-1.5">
                  <Hash className="text-crypto-blue h-5 w-5" />
                </div>
                <h1 className="text-xl font-display font-semibold">#{name}</h1>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
                <span className="ml-2 text-gray-400">Loading tweets...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-crypto-blue text-white px-4 py-2 rounded-full hover:bg-crypto-blue/80"
                >
                  Try Again
                </button>
              </div>
            ) : tweets.length === 0 ? (
              <div className="p-6 text-center border-b border-gray-800 bg-black">
                <p className="text-gray-400">No tweets with #{name} yet.</p>
              </div>
            ) : (
              <div>
                {tweets.map((tweet) => (
                  <TweetCard
                    key={tweet.id}
                    tweet={tweet}
                    onClick={() => {/* Handle click */}}
                    onAction={() => {/* Handle action */}}
                    onDelete={() => {/* Handle delete */}}
                    onRetweetRemoved={() => {/* Handle retweet removed */}}
                    onError={() => {/* Handle error */}}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
        
        <RightSidebar />
      </div>
    </div>
  );
};

export default HashtagPage;
