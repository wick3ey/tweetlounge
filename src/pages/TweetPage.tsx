
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor } from '@/types/Tweet';
import Layout from '@/components/layout/Layout';
import TweetDetail from '@/components/tweet/TweetDetail';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TweetPage = () => {
  const { tweetId } = useParams();
  const [tweet, setTweet] = useState<TweetWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTweet = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch tweet with author using RPC
        const { data, error } = await supabase
          .rpc('get_tweet_with_author_reliable', { tweet_id: tweetId });

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          setError('Tweet not found');
          return;
        }

        const tweetData = data[0];
        
        // Transform the data to match TweetWithAuthor format
        const formattedTweet: TweetWithAuthor = {
          id: tweetData.id,
          content: tweetData.content,
          author_id: tweetData.author_id,
          created_at: tweetData.created_at,
          likes_count: tweetData.likes_count,
          retweets_count: tweetData.retweets_count,
          replies_count: tweetData.replies_count,
          is_retweet: tweetData.is_retweet,
          original_tweet_id: tweetData.original_tweet_id,
          image_url: tweetData.image_url,
          author: {
            id: tweetData.author_id,
            username: tweetData.username,
            display_name: tweetData.display_name,
            avatar_url: tweetData.avatar_url || '',
            avatar_nft_id: tweetData.avatar_nft_id,
            avatar_nft_chain: tweetData.avatar_nft_chain
          }
        };

        setTweet(formattedTweet);
      } catch (err) {
        console.error('Failed to fetch tweet:', err);
        setError('Failed to load tweet. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load tweet. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (tweetId) {
      fetchTweet();
    }
  }, [tweetId, toast]);

  const handleTweetAction = () => {
    // Refresh the tweet data when actions are performed
    if (tweetId) {
      const fetchUpdatedTweet = async () => {
        try {
          const { data, error } = await supabase
            .rpc('get_tweet_with_author_reliable', { tweet_id: tweetId });

          if (error) {
            throw error;
          }

          if (!data || data.length === 0) {
            return;
          }

          const tweetData = data[0];
          setTweet(prev => prev ? {
            ...prev,
            likes_count: tweetData.likes_count,
            retweets_count: tweetData.retweets_count,
            replies_count: tweetData.replies_count
          } : null);
        } catch (err) {
          console.error('Failed to refresh tweet:', err);
        }
      };

      fetchUpdatedTweet();
    }
  };

  const handleTweetDeleted = (deletedTweetId: string) => {
    toast({
      title: "Tweet Deleted",
      description: "Your tweet has been successfully deleted."
    });
    // Navigate back to home if the tweet was deleted
    navigate('/home');
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
          <span className="ml-2 text-gray-400">Loading tweet...</span>
        </div>
      </Layout>
    );
  }

  if (error || !tweet) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-red-500 mb-4">{error || 'Tweet not found'}</p>
          <Button 
            onClick={handleBack}
            className="bg-crypto-blue text-white px-4 py-2 rounded-full hover:bg-crypto-blue/80"
          >
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-gray-800 p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="rounded-full hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Tweet</h1>
          </div>
        </div>
        
        <div className="mt-2">
          <TweetDetail 
            tweet={tweet} 
            onClose={() => {}} // No-op since we're on the dedicated page
            onAction={handleTweetAction}
            onDelete={handleTweetDeleted}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TweetPage;
