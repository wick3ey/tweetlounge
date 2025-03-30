import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor } from '@/types/Tweet';
import Layout from '@/components/layout/Layout';
import CommentList from '@/components/comment/CommentList';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Share2, MoreHorizontal, Heart, Repeat, MessageSquare, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { followUser, unfollowUser, isFollowing } from '@/services/profileService';
import CommentForm from '@/components/comment/CommentForm';
import { checkIfUserLikedTweet, likeTweet, retweet, checkIfUserRetweetedTweet } from '@/services/tweetService';
import { checkIfTweetBookmarked, bookmarkTweet, unbookmarkTweet } from '@/services/bookmarkService';
import { VerifiedBadge } from '@/components/ui/badge';

const TweetPage = () => {
  const { tweetId } = useParams();
  const [tweet, setTweet] = useState<TweetWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    const fetchTweet = async () => {
      try {
        setLoading(true);
        setError(null);

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

        if (tweetData.is_retweet && tweetData.original_tweet_id) {
          try {
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .from('tweets')
              .select(`
                id,
                author_id,
                profiles:author_id (
                  username,
                  display_name,
                  avatar_url,
                  avatar_nft_id,
                  avatar_nft_chain
                )
              `)
              .eq('id', tweetData.original_tweet_id)
              .single();

            if (!originalTweetError && originalTweetData && originalTweetData.profiles) {
              const profileData = Array.isArray(originalTweetData.profiles) 
                ? originalTweetData.profiles[0]
                : originalTweetData.profiles;
                
              formattedTweet.original_author = {
                id: originalTweetData.author_id,
                username: profileData.username,
                display_name: profileData.display_name,
                avatar_url: profileData.avatar_url || '',
                avatar_nft_id: profileData.avatar_nft_id,
                avatar_nft_chain: profileData.avatar_nft_chain
              };
            }
          } catch (originalTweetError) {
            console.error('Error fetching original tweet:', originalTweetError);
          }
        }

        setTweet(formattedTweet);
        
        checkIfUserIsAuthor(tweetData.author_id);
        
        if (user && user.id !== tweetData.author_id) {
          checkIfFollowingAuthor(tweetData.author_id);
        }

        if (user && tweetId) {
          checkTweetInteractions(tweetId);
        }
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
  }, [tweetId, toast, user]);

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

  const checkIfFollowingAuthor = async (authorId: string) => {
    if (!user) return;
    const following = await isFollowing(authorId);
    setIsFollowingAuthor(following);
  };

  const checkTweetInteractions = async (tweetId: string) => {
    try {
      const liked = await checkIfUserLikedTweet(tweetId);
      setIsLiked(liked);

      const retweeted = await checkIfUserRetweetedTweet(tweetId);
      setIsRetweeted(retweeted);

      const bookmarked = await checkIfTweetBookmarked(tweetId);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error('Error checking tweet interactions:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to follow users",
        variant: "destructive",
      });
      return;
    }

    if (!tweet) return;

    try {
      let success;
      if (isFollowingAuthor) {
        success = await unfollowUser(tweet.author.id);
        if (success) {
          toast({
            title: "Unfollowed",
            description: `You are no longer following ${tweet.author.display_name}`,
          });
          setIsFollowingAuthor(false);
        }
      } else {
        success = await followUser(tweet.author.id);
        if (success) {
          toast({
            title: "Following",
            description: `You are now following ${tweet.author.display_name}`,
          });
          setIsFollowingAuthor(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "There was a problem with your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTweetAction = () => {
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
    navigate('/home');
  };

  const handleBack = () => {
    navigate(-1);
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
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Tweet link copied to clipboard",
      });
    }
  };

  const handleCommentSubmit = () => {
    handleTweetAction();
    setShowReplyForm(false);
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to like posts",
        variant: "destructive",
      });
      return;
    }

    if (!tweetId) return;

    try {
      const success = await likeTweet(tweetId);
      if (success) {
        setIsLiked(!isLiked);
        handleTweetAction();
        if (!isLiked) {
          toast({
            title: "Liked",
            description: "You liked this post",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to like/unlike post",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error liking tweet:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRetweetToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to repost",
        variant: "destructive",
      });
      return;
    }

    if (!tweetId) return;

    try {
      const success = await retweet(tweetId);
      if (success) {
        setIsRetweeted(!isRetweeted);
        handleTweetAction();
        toast({
          title: isRetweeted ? "Repost Removed" : "Reposted",
          description: isRetweeted ? "You removed your repost" : "You reposted this post",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to repost",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error retweeting:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to bookmark posts",
        variant: "destructive",
      });
      return;
    }

    if (!tweetId) return;

    try {
      let success;
      if (isBookmarked) {
        success = await unbookmarkTweet(tweetId);
        if (success) {
          setIsBookmarked(false);
          toast({
            title: "Bookmark Removed",
            description: "Post removed from your bookmarks",
          });
        }
      } else {
        success = await bookmarkTweet(tweetId);
        if (success) {
          setIsBookmarked(true);
          toast({
            title: "Bookmarked",
            description: "Post added to your bookmarks",
          });
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  let displayAuthor = tweet?.author;
  let retweetedBy = null;
  
  if (tweet?.is_retweet && tweet?.original_author) {
    displayAuthor = tweet.original_author;
    retweetedBy = tweet.author;
  }
  
  const isNFTVerified = displayAuthor?.avatar_nft_id && displayAuthor?.avatar_nft_chain;

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
    <Layout>
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
        <article className="border-b border-gray-800">
          <div className="p-4">
            {tweet?.is_retweet && retweetedBy && (
              <div className="flex items-center text-gray-500 text-sm mb-3">
                <Repeat className="h-4 w-4 mr-2" />
                <span>{retweetedBy.display_name} reposted</span>
              </div>
            )}
            
            <div className="flex items-start mb-2">
              <Link 
                to={`/profile/${displayAuthor?.username}`} 
                className="mr-3 flex-shrink-0"
              >
                <Avatar className="h-12 w-12 rounded-full">
                  <AvatarImage 
                    src={displayAuthor?.avatar_url} 
                    alt={displayAuthor?.display_name || ''} 
                  />
                  <AvatarFallback className="bg-gray-800 text-white">
                    {displayAuthor?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <Link 
                        to={`/profile/${displayAuthor?.username}`} 
                        className="font-bold text-white hover:underline flex items-center"
                      >
                        {displayAuthor?.display_name}
                        {isNFTVerified && <VerifiedBadge />}
                      </Link>
                      <span className="text-gray-500 text-sm">
                        @{displayAuthor?.username}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      {user && !isAuthor && !isFollowingAuthor && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleFollowToggle}
                          className="rounded-full text-sm font-medium hover:bg-blue-500/10 border-none hover:text-white ml-2"
                        >
                          Follow
                        </Button>
                      )}
                      {user && !isAuthor && isFollowingAuthor && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleFollowToggle}
                          className="rounded-full text-sm font-medium bg-gray-800 text-white hover:bg-red-500/10 hover:text-red-500 ml-2"
                        >
                          Following
                        </Button>
                      )}
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
            
            <div className="mt-1">
              <p className="text-[17px] text-white whitespace-pre-wrap mb-4 leading-normal">{tweet?.content}</p>
              
              {tweet?.image_url && (
                <div className="mt-3 mb-3">
                  <img 
                    src={tweet?.image_url} 
                    alt="Tweet attachment" 
                    className="rounded-2xl max-h-[500px] w-full object-cover border border-gray-800" 
                  />
                </div>
              )}
              
              <div className="flex items-center text-gray-500 mt-3 mb-3 text-sm">
                <span>{getFormattedDate(tweet?.created_at)}</span>
                <span className="mx-1">·</span>
                <span>{tweet?.replies_count + tweet?.retweets_count + tweet?.likes_count} Views</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <button 
                className={`flex items-center space-x-1 hover:text-crypto-blue transition-colors`}
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <MessageSquare className={`h-5 w-5 ${showReplyForm ? 'text-crypto-blue' : ''}`} />
                <span>{tweet?.replies_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 transition-colors ${isRetweeted ? 'text-crypto-green' : 'hover:text-crypto-green'}`}
                onClick={handleRetweetToggle}
              >
                <Repeat className={`h-5 w-5 ${isRetweeted ? 'fill-current text-crypto-green' : ''}`} />
                <span>{tweet?.retweets_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 transition-colors ${isLiked ? 'text-crypto-red' : 'hover:text-crypto-red'}`}
                onClick={handleLikeToggle}
              >
                <Heart 
                  className={`h-5 w-5 ${isLiked ? 'fill-current text-crypto-red' : ''}`} 
                  strokeWidth={isLiked ? 0 : 1.5}
                />
                <span>{tweet?.likes_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 transition-colors ${isBookmarked ? 'text-crypto-purple' : 'hover:text-crypto-purple'}`} 
                onClick={handleBookmarkToggle}
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current text-crypto-purple' : ''}`} />
              </button>
              
              <button 
                className="flex items-center space-x-1 hover:text-crypto-blue transition-colors" 
                onClick={handleShareTweet}
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </article>
        
        {showReplyForm && (
          <div className="p-4 border-b border-gray-800">
            <CommentForm 
              tweetId={tweet.id} 
              onSubmit={handleCommentSubmit} 
            />
          </div>
        )}
        
        {!showReplyForm && (
          <div className="flex gap-3 p-3 border-b border-gray-800">
            <Avatar className="h-10 w-10 rounded-full">
              <AvatarImage 
                src={profile?.avatar_url || ""} 
                alt="Your avatar" 
              />
              <AvatarFallback className="bg-gray-800 text-white">
                {profile?.display_name?.charAt(0).toUpperCase() || 
                 user?.email?.charAt(0).toUpperCase() || 
                 "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex items-center">
              <span className="text-gray-500">Post your reply</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplyForm(true)}
              className="rounded-full bg-transparent text-gray-500 hover:bg-crypto-blue/10 border border-gray-700 text-sm"
            >
              Reply
            </Button>
          </div>
        )}
        
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
