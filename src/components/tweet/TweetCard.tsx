
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onLike?: () => void;
  onRetweet?: () => void;
  onReply?: () => void;
}

const TweetCard = ({ tweet, onLike, onRetweet, onReply }: TweetCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    if (onLike) onLike();
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });

  return (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition">
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <Repeat className="h-4 w-4 mr-2" />
          <span>{tweet.author.display_name} retweeted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/profile/${tweet.author.username}`}>
          <Avatar className="h-12 w-12">
            {tweet.author.avatar_url ? (
              <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white">
              {getInitials(tweet.author.display_name || tweet.author.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center">
            <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline">
              {tweet.author.display_name}
            </Link>
            <span className="text-gray-500 ml-2">
              @{tweet.author.username} · {timeAgo}
            </span>
          </div>
          <div className="mt-2 text-gray-900">{tweet.content}</div>
          {tweet.image_url && (
            <div className="mt-3">
              <img 
                src={tweet.image_url} 
                alt="Tweet media"
                className="rounded-xl max-h-80 w-auto" 
              />
            </div>
          )}
          <div className="flex justify-between mt-3 max-w-md">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReply} 
              className="text-gray-500 hover:text-twitter-blue"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>{tweet.replies_count}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRetweet} 
              className="text-gray-500 hover:text-green-500"
            >
              <Repeat className="h-4 w-4 mr-2" />
              <span>{tweet.retweets_count}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike} 
              className={`${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart className="h-4 w-4 mr-2" fill={liked ? "currentColor" : "none"} />
              <span>{liked ? tweet.likes_count + 1 : tweet.likes_count}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-twitter-blue"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
