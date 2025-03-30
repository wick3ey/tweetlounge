
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor } from '@/types/Tweet';
import Layout from '@/components/layout/Layout';
import TweetDetail from '@/components/tweet/TweetDetail';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Calendar, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';

const TweetPage = () => {
  const { tweetId } = useParams();
  const [tweet, setTweet] = useState<TweetWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
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
        
        // Check if the current user is the author
        checkIfUserIsAuthor(tweetData.author_id);
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

  // Check if the current user is the author of the tweet
  const checkIfUserIsAuthor = async (authorId: string) => {
    try {
      const { data } = await supabase.auth.getUser();
      const currentUserId = data?.user?.id;
      setIsAuthor(currentUserId === authorId);
    } catch (error) {
      console.error('Error getting current user:', error);
      setIsAuthor(false);
    }
  };

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

  const getFormattedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "h:mm a · MMM d, yyyy");
    } catch (e) {
      return "Unknown date";
    }
  };

  const handleShareTweet = () => {
    if (navigator.share && tweet) {
      navigator.share({
        title: `Tweet by ${tweet.author.display_name}`,
        text: tweet.content,
        url: window.location.href
      }).catch((error) => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Tweet link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
          <div className="flex flex-col items-center p-6">
            <Loader2 className="h-10 w-10 animate-spin text-crypto-blue mb-4" />
            <p className="text-crypto-lightgray text-sm">Loading tweet...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !tweet) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-6 min-h-[50vh]">
          <div className="bg-crypto-darkgray p-8 rounded-xl border border-gray-800 max-w-md w-full text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-4">{error || 'Tweet not found'}</h2>
            <p className="text-crypto-lightgray mb-6">The tweet you're looking for doesn't exist or has been deleted.</p>
            <Button 
              onClick={handleBack}
              className="bg-crypto-blue text-white hover:bg-crypto-blue/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideRightSidebar>
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/90 border-b border-gray-800">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="rounded-full hover:bg-gray-800 mr-4"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Tweet</h1>
        </div>
      </div>
      
      <div className="max-w-[600px] mx-auto">
        {/* Tweet Card - Main content */}
        <article className="border-b border-gray-800">
          {/* Author Info */}
          <div className="p-4">
            <div className="flex items-start mb-3">
              <Link to={`/profile/${tweet.author.username}`} className="mr-3 flex-shrink-0">
                <Avatar className="h-12 w-12 rounded-full border border-gray-700 hover:border-crypto-blue transition-colors">
                  <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name || tweet.author.username} />
                  <AvatarFallback className="bg-crypto-darkgray text-crypto-blue">
                    {tweet.author.display_name?.charAt(0) || tweet.author.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <Link to={`/profile/${tweet.author.username}`} className="group">
                    <span className="font-bold text-white hover:underline group-hover:text-white/90 transition-colors">
                      {tweet.author.display_name}
                    </span>
                    <span className="text-gray-500 text-sm block">@{tweet.author.username}</span>
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleShareTweet}
                  className="rounded-full hover:bg-gray-800/60"
                  aria-label="Share tweet"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                
                {isAuthor && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-800/60 ml-1"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Tweet Content */}
            <div className="mb-4">
              <p className="text-xl whitespace-pre-wrap mb-4 leading-relaxed">{tweet.content}</p>
              
              {tweet.image_url && (
                <div className="mt-3 mb-4">
                  <img 
                    src={tweet.image_url} 
                    alt="Tweet attachment" 
                    className="rounded-xl max-h-[500px] w-full object-cover border border-gray-800" 
                  />
                </div>
              )}
              
              <div className="flex items-center text-gray-500 mt-4 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{getFormattedDate(tweet.created_at)}</span>
              </div>
            </div>
            
            {/* Tweet Stats */}
            {tweet.retweets_count > 0 || tweet.likes_count > 0 || tweet.replies_count > 0 ? (
              <div className="flex py-3 border-y border-gray-800 my-3">
                {tweet.retweets_count > 0 && (
                  <div className="flex items-baseline mr-5">
                    <span className="text-white font-bold mr-1">{tweet.retweets_count}</span>
                    <span className="text-gray-500 text-sm">{tweet.retweets_count === 1 ? 'Retweet' : 'Retweets'}</span>
                  </div>
                )}
                
                {tweet.likes_count > 0 && (
                  <div className="flex items-baseline mr-5">
                    <span className="text-white font-bold mr-1">{tweet.likes_count}</span>
                    <span className="text-gray-500 text-sm">{tweet.likes_count === 1 ? 'Like' : 'Likes'}</span>
                  </div>
                )}
                
                {tweet.replies_count > 0 && (
                  <div className="flex items-baseline">
                    <span className="text-white font-bold mr-1">{tweet.replies_count}</span>
                    <span className="text-gray-500 text-sm">{tweet.replies_count === 1 ? 'Comment' : 'Comments'}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </article>
        
        {/* Tweet Interaction Section with Comments */}
        <div className="bg-black">
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
