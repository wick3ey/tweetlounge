
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor } from '@/types/Tweet';
import Layout from '@/components/layout/Layout';
import TweetDetail from '@/components/tweet/TweetDetail';
import CommentList from '@/components/comment/CommentList';
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
            <p className="text-gray-500 text-sm">Loading tweet...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !tweet) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-6 min-h-[50vh]">
          <div className="bg-black p-8 rounded-xl border border-gray-800 max-w-md w-full text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-4">{error || 'Tweet not found'}</h2>
            <p className="text-gray-500 mb-6">The tweet you're looking for doesn't exist or has been deleted.</p>
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
      {/* Twitter-style header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-black border-b border-gray-800">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="rounded-full hover:bg-gray-800 mr-4"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <h1 className="text-xl font-bold text-white">Post</h1>
        </div>
      </div>
      
      <div className="max-w-[600px] mx-auto">
        {/* Main Tweet */}
        <article className="border-b border-gray-800">
          {/* Author Info + Tweet Header */}
          <div className="p-4">
            <div className="flex items-start mb-2">
              <Link to={`/profile/${tweet.author.username}`} className="mr-3 flex-shrink-0">
                <Avatar className="h-12 w-12 rounded-full">
                  <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name || tweet.author.username} />
                  <AvatarFallback className="bg-gray-800 text-white">
                    {tweet.author.display_name?.charAt(0) || tweet.author.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <Link to={`/profile/${tweet.author.username}`} className="font-bold text-white hover:underline">
                        {tweet.author.display_name}
                        {tweet.author.username === 'sweep' && (
                          <span className="ml-1 text-crypto-blue">✓</span>
                        )}
                      </Link>
                      <span className="text-gray-500 text-sm">@{tweet.author.username}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="rounded-full text-sm font-medium hover:bg-blue-500/10 border-none hover:text-white ml-2"
                      >
                        Subscribe
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleShareTweet}
                        className="rounded-full hover:bg-gray-800 ml-1"
                        aria-label="Share tweet"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tweet Content */}
            <div className="mt-1">
              <p className="text-[17px] text-white whitespace-pre-wrap mb-4 leading-normal">{tweet.content}</p>
              
              {tweet.image_url && (
                <div className="mt-3 mb-3">
                  <img 
                    src={tweet.image_url} 
                    alt="Tweet attachment" 
                    className="rounded-2xl max-h-[500px] w-full object-cover border border-gray-800" 
                  />
                </div>
              )}
              
              <div className="flex items-center text-gray-500 mt-3 mb-3 text-sm">
                <span>{getFormattedDate(tweet.created_at)}</span>
                <span className="mx-1">·</span>
                <span>{tweet.replies_count + tweet.retweets_count + tweet.likes_count} Views</span>
              </div>
            </div>
            
            {/* Tweet Stats Border */}
            <div className="flex py-3 border-y border-gray-800 my-2">
              <div className="flex items-center mr-5">
                <span className="text-white font-bold mr-1">{tweet.replies_count || 0}</span>
                <span className="text-gray-500 text-sm">{tweet.replies_count === 1 ? 'Reply' : 'Replies'}</span>
              </div>
              
              <div className="flex items-center mr-5">
                <span className="text-white font-bold mr-1">{tweet.retweets_count || 0}</span>
                <span className="text-gray-500 text-sm">{tweet.retweets_count === 1 ? 'Repost' : 'Reposts'}</span>
              </div>
              
              <div className="flex items-center mr-5">
                <span className="text-white font-bold mr-1">{tweet.likes_count || 0}</span>
                <span className="text-gray-500 text-sm">{tweet.likes_count === 1 ? 'Like' : 'Likes'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="text-white font-bold mr-1">1</span>
                <span className="text-gray-500 text-sm">Bookmark</span>
              </div>
            </div>
            
            {/* Tweet Actions */}
            <div className="flex justify-between items-center py-1">
              <button className="text-gray-500 hover:text-crypto-blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g>
                </svg>
              </button>
              
              <button className="text-gray-500 hover:text-crypto-green">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>
                </svg>
              </button>
              
              <button className="text-gray-500 hover:text-crypto-red">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g>
                </svg>
              </button>
              
              <button className="text-gray-500 hover:text-crypto-blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M17.5 1.25c.69 0 1.37.5 1.5 1.24l.12 1.67c.27.07.53.17.79.29l1.5-.65c.65-.29 1.42-.03 1.78.56l.84 1.45c.36.62.18 1.41-.36 1.86l-1.34 1.13c.01.12.01.25.01.37s0 .25-.01.37l1.34 1.13c.54.45.72 1.24.36 1.86l-.84 1.45c-.36.59-1.13.85-1.78.56l-1.5-.65c-.26.12-.52.22-.79.29l-.12 1.67c-.13.74-.81 1.25-1.5 1.25H15c-.69 0-1.37-.5-1.5-1.24l-.12-1.67c-.27-.07-.53-.17-.79-.29l-1.5.65c-.65.29-1.42.03-1.78-.56l-.84-1.45c-.36-.62-.17-1.41.36-1.86l1.34-1.13c-.01-.12-.01-.25-.01-.37s0-.25.01-.37l-1.34-1.13c-.54-.45-.72-1.24-.36-1.86l.84-1.45c.36-.59 1.13-.85 1.78-.56l1.5.65c.26-.12.52-.22.79-.29l.12-1.67c.13-.74.81-1.25 1.5-1.25H17.5zM16.25 12c0 1.52-1.23 2.75-2.75 2.75s-2.75-1.23-2.75-2.75 1.23-2.75 2.75-2.75 2.75 1.23 2.75 2.75z"></path></g>
                </svg>
              </button>
              
              <button className="text-gray-500 hover:text-crypto-blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g>
                </svg>
              </button>
              
              <button className="text-gray-500 hover:text-crypto-blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <g><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></g>
                </svg>
              </button>
            </div>
          </div>
        </article>
        
        {/* Reply Input Section - Twitter Style */}
        <div className="flex gap-3 p-3 border-b border-gray-800">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src="" alt="Your avatar" />
            <AvatarFallback className="bg-gray-800 text-white">
              U
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 flex items-center">
            <span className="text-gray-500">Post your reply</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-transparent text-gray-500 hover:bg-crypto-blue/10 border border-gray-700 text-sm"
          >
            Reply
          </Button>
        </div>
        
        {/* Tweet Comments Section - Only include CommentList to avoid duplication */}
        <div className="bg-black p-4">
          <CommentList 
            tweetId={tweet.id} 
            onCommentCountUpdated={(count) => {
              if (tweet) {
                setTweet(prev => prev ? { ...prev, replies_count: count } : null);
              }
            }}
            onAction={handleTweetAction}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TweetPage;
