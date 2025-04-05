import { useState, useEffect } from 'react';
import { Loader2, BookmarkX } from 'lucide-react';
import { getBookmarkedTweets } from '@/services/bookmarkService';
import { TweetWithAuthor } from '@/types/Tweet';
import TweetCard from '@/components/tweet/TweetCard';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Bookmarks = () => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const tweetsPerPage = 10;

  const fetchBookmarkedTweets = async (currentPage: number) => {
    setLoading(true);
    try {
      const offset = currentPage * tweetsPerPage;
      const data = await getBookmarkedTweets(tweetsPerPage, offset);
      
      if (currentPage === 0) {
        setTweets(data);
      } else {
        setTweets(prev => [...prev, ...data]);
      }
      
      setHasMore(data.length === tweetsPerPage);
    } catch (error) {
      console.error('Failed to fetch bookmarked tweets:', error);
      toast({
        title: "Error",
        description: "Failed to load bookmarked tweets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarkedTweets(0);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBookmarkedTweets(nextPage);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchBookmarkedTweets(0);
  };

  const handleTweetClick = (tweetId: string) => {
    navigate(`/tweet/${tweetId}`);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold flex items-center">
                <BookmarkX className="h-5 w-5 mr-2 text-crypto-purple" />
                Bookmarks
              </h1>
              <span className="text-gray-500 text-sm">
                {tweets.length > 0 ? `${tweets.length} saved items` : ''}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="text-sm text-crypto-purple hover:text-crypto-purple hover:bg-crypto-purple/10 border-crypto-purple/30"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-800">
          {loading && page === 0 ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-crypto-purple" />
              <span className="ml-2 text-gray-400">Loading bookmarks...</span>
            </div>
          ) : tweets.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-crypto-purple/10 flex items-center justify-center mb-4">
                <BookmarkX className="h-8 w-8 text-crypto-purple" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No bookmarks yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                When you bookmark tweets, they'll appear here for easy access later. Bookmark tweets by clicking the bookmark icon.
              </p>
              <Button
                onClick={() => navigate('/home')}
                variant="outline"
                className="border-crypto-purple text-crypto-purple hover:bg-crypto-purple/10"
              >
                Explore posts
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-0">
                {tweets.map(tweet => (
                  <TweetCard
                    key={`${tweet.id}-${tweet.bookmarked_at}`}
                    tweet={tweet}
                    onClick={() => handleTweetClick(tweet.id)}
                    onAction={handleRefresh}
                    onError={(title, description) => {
                      toast({
                        title,
                        description,
                        variant: "destructive"
                      });
                    }}
                  />
                ))}
              </div>
              
              {hasMore && (
                <div className="p-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="border-crypto-purple text-crypto-purple hover:bg-crypto-purple/10 min-w-[120px]"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Bookmarks;
