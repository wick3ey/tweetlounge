
import React, { useState, useEffect } from 'react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Repeat2, Heart, BarChart4, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

// Add function to check if user liked tweet
const checkIfUserLikedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user?.id) return false;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('tweet_id', tweetId)
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIfUserLikedTweet:', error);
    return false;
  }
};

// Add function to like or unlike a tweet
const likeTweet = async (tweetId: string, isCurrentlyLiked: boolean = false): Promise<boolean> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData || !authData.user) {
      console.error('User not authenticated');
      return false;
    }

    const userId = authData.user.id;

    if (isCurrentlyLiked) {
      // Unlike the tweet
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweetId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error unliking tweet:', error);
        return false;
      }

      return true;
    } else {
      // Like the tweet
      const { error } = await supabase
        .from('likes')
        .insert([{ tweet_id: tweetId, user_id: userId }]);

      if (error) {
        // If duplicate key error, the tweet is already liked
        if (error.code === '23505') {
          return true;
        }
        console.error('Error liking tweet:', error);
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error('Error in likeTweet:', error);
    return false;
  }
};

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
  onError?: (title: string, description: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onClick, onAction, onDelete, onError }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count || 0);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (user) {
      checkIfUserLikedTweet(tweet.id).then(liked => {
        setIsLiked(liked);
      }).catch(error => {
        console.error('Error checking like status:', error);
      });
    }
  }, [tweet.id, user]);
  
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (onError) {
        onError('Authentication Required', 'You need to be logged in to like tweets.');
      }
      return;
    }
    
    try {
      const success = await likeTweet(tweet.id, isLiked);
      
      if (success) {
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(!isLiked);
        if (onAction) onAction();
      }
    } catch (error) {
      console.error('Error liking tweet:', error);
      if (onError) {
        onError('Error', 'Could not update like status. Please try again.');
      }
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'recently';
    }
  };
  
  const getFormattedTimeAgo = (dateString: string) => {
    const timeAgo = formatTimeAgo(dateString);
    // Convert "about 1 hour ago" to "1h" or "3 days ago" to "3d"
    if (timeAgo.includes('second')) return timeAgo.replace(/about | seconds ago/, 's');
    if (timeAgo.includes('minute')) return timeAgo.replace(/about | minutes ago/, 'm');
    if (timeAgo.includes('hour')) return timeAgo.replace(/about | hours ago/, 'h');
    if (timeAgo.includes('day')) return timeAgo.replace(/about | days ago/, 'd');
    if (timeAgo.includes('month')) return timeAgo.replace(/about | months ago/, 'mo');
    if (timeAgo.includes('year')) return timeAgo.replace(/about | years ago/, 'y');
    return timeAgo;
  };
  
  // Fixed: Use proper author data, ensuring we always have a valid username and display name
  const authorUsername = tweet.profile_username || tweet.author?.username || 'user';
  const authorDisplayName = tweet.profile_display_name || tweet.author?.display_name || 'User';
  const authorAvatar = tweet.profile_avatar_url || tweet.author?.avatar_url || '';
  
  const renderMobileTweet = () => (
    <div 
      className="border-b border-gray-800 p-3 hover:bg-gray-900/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex">
        <div className="mr-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="bg-blue-500/20 text-blue-500">
              {authorUsername.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="font-bold text-white mr-1 truncate">
              {authorDisplayName}
            </span>
            <span className="text-gray-500 text-sm truncate mr-1">
              @{authorUsername}
            </span>
            <span className="text-gray-500 text-sm">· {getFormattedTimeAgo(tweet.created_at)}</span>
          </div>
          
          <p className="text-white mt-1 break-words">{tweet.content}</p>
          
          {tweet.image_url && (
            <div className="mt-2 rounded-xl overflow-hidden">
              <img 
                src={tweet.image_url} 
                alt="Tweet media" 
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-gray-500">
            <button className="flex items-center hover:text-blue-400 transition-colors">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="text-xs">{tweet.replies_count || 0}</span>
            </button>
            
            <button className="flex items-center hover:text-green-400 transition-colors">
              <Repeat2 className="h-4 w-4 mr-1" />
              <span className="text-xs">{tweet.retweets_count || 0}</span>
            </button>
            
            <button 
              className={`flex items-center ${isLiked ? 'text-red-500' : 'hover:text-red-500'} transition-colors`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likesCount}</span>
            </button>
            
            <button className="flex items-center hover:text-blue-400 transition-colors">
              <BarChart4 className="h-4 w-4" />
            </button>
            
            <button className="flex items-center hover:text-blue-400 transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderDesktopTweet = () => (
    <div 
      className="border-b border-gray-800 p-4 hover:bg-gray-900/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex">
        <div className="mr-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="bg-blue-500/20 text-blue-500">
              {authorUsername.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-semibold text-white mr-1">{authorDisplayName}</span>
              <span className="text-gray-500">@{authorUsername}</span>
              <span className="text-gray-500 ml-2">• {getFormattedTimeAgo(tweet.created_at)}</span>
            </div>
            <MoreHorizontal className="text-gray-500 cursor-pointer" />
          </div>
          <div className="mt-2 text-white">{tweet.content}</div>
          {tweet.image_url && (
            <img src={tweet.image_url} alt="Tweet" className="mt-3 rounded-xl w-full" />
          )}
          <div className="flex justify-between items-center mt-4 text-gray-500">
            <button className="hover:text-blue-400 flex items-center">
              <MessageSquare className="h-5 w-5 mr-1" />
              {tweet.replies_count || 0}
            </button>
            <button className="hover:text-green-400 flex items-center">
              <Repeat2 className="h-5 w-5 mr-1" />
              {tweet.retweets_count || 0}
            </button>
            <button 
              className={`hover:text-red-400 flex items-center ${isLiked ? 'text-red-500' : ''}`}
              onClick={handleLike}
            >
              <Heart className="h-5 w-5 mr-1" fill={isLiked ? 'currentColor' : 'none'} />
              {likesCount}
            </button>
            <BarChart4 className="hover:text-blue-400 cursor-pointer" />
            <Share2 className="hover:text-blue-400 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
  
  return isMobile ? renderMobileTweet() : renderDesktopTweet();
};

export default TweetCard;
export { checkIfUserLikedTweet, likeTweet };
