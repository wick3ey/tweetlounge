
import { useState, useEffect } from 'react';
import { Loader2, BookmarkX } from 'lucide-react';
import { getBookmarkedTweets } from '@/services/bookmarkService';
import { TweetWithAuthor } from '@/types/Tweet';
import TweetCard from '@/components/tweet/TweetCard';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Bookmarks = () => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
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
            <h1 className="text-xl font-bold">Bookmarks</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-800">
          {loading && page === 0 ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-400">Loading bookmarks...</span>
            </div>
          ) : tweets.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <BookmarkX className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No bookmarks yet</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                When you bookmark tweets, they'll appear here for easy access later. Bookmark tweets by clicking the bookmark icon.
              </p>
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
                  />
                ))}
              </div>
              
              {hasMore && (
                <div className="p-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="border-gray-700 text-gray-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
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
