
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getConversations, Conversation } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';

const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const userConversations = await getConversations();
        setConversations(userConversations);
      } catch (error) {
        console.error('Failed to fetch conversations', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user]);

  const truncateMessage = (message: string, length = 50) => 
    message.length > length ? message.substring(0, length) + '...' : message;

  if (loading) {
    return <div className="text-center py-4">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-crypto-lightgray">
        <MessageSquare className="h-12 w-12 mb-4 text-crypto-gray" />
        <p>No conversations yet</p>
        <p className="text-sm">Start a conversation with another user</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-crypto-gray">
      {conversations.map(conv => {
        const otherUser = conv.participants?.[0];
        return (
          <Link 
            key={conv.id} 
            to={`/messages/${conv.id}`} 
            className="block hover:bg-crypto-darkgray p-4 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={otherUser?.avatar_url || ''} />
                <AvatarFallback>
                  {otherUser?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-crypto-text">
                    {otherUser?.display_name || otherUser?.username}
                  </h3>
                  <span className="text-xs text-crypto-lightgray">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {conv.lastMessage && (
                  <p className="text-sm text-crypto-lightgray">
                    {truncateMessage(conv.lastMessage.content)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ConversationList;
