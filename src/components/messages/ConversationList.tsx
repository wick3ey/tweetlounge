
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, PlusCircle } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/services/messageService';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedConversationId?: string;
  onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  loading, 
  selectedConversationId,
  onSelectConversation 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  
  const truncateMessage = (message: string, length = 50) => 
    message.length > length ? message.substring(0, length) + '...' : message;

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.participants?.[0];
    const displayName = otherUser?.display_name || otherUser?.username || '';
    const username = otherUser?.username || '';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="text-center py-4">Loading conversations...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-crypto-gray">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {filteredConversations.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center p-8 text-crypto-lightgray">
            <MessageSquare className="h-12 w-12 mb-4 text-crypto-gray" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a conversation with another user</p>
          </div>
        )}

        {filteredConversations.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center p-8 text-crypto-lightgray">
            <Search className="h-12 w-12 mb-4 text-crypto-gray" />
            <p>No results found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        )}

        <div className="divide-y divide-crypto-gray">
          {filteredConversations.map(conv => {
            const otherUser = conv.participants?.[0] || conv.other_user;
            const isRead = conv.unread_count === 0; 
            
            return (
              <div 
                key={conv.id} 
                onClick={() => onSelectConversation(conv.id)}
                className={`block hover:bg-crypto-darkgray p-4 transition-colors cursor-pointer ${selectedConversationId === conv.id ? 'bg-crypto-darkgray' : ''}`}
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
                      <div className="flex items-center">
                        <h3 className={`font-bold ${!isRead ? 'text-crypto-blue' : 'text-crypto-text'}`}>
                          {otherUser?.display_name || otherUser?.username}
                        </h3>
                        {otherUser?.avatar_nft_id && otherUser?.avatar_nft_chain && (
                          <VerifiedBadge className="ml-1" />
                        )}
                      </div>
                      <span className="text-xs text-crypto-lightgray">
                        {conv.last_message_time 
                          ? new Date(conv.last_message_time).toLocaleDateString() 
                          : new Date(conv.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      {(conv.lastMessage || conv.last_message) && (
                        <p className={`text-sm ${!isRead ? 'text-crypto-text font-semibold' : 'text-crypto-lightgray'}`}>
                          {conv.lastMessage?.is_deleted || false
                            ? <span className="italic">Message was deleted</span>
                            : truncateMessage(conv.lastMessage?.content || conv.last_message || '')
                          }
                        </p>
                      )}
                      {!isRead && (
                        <Badge variant="success" className="h-2 w-2 rounded-full p-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-crypto-gray">
        <Button className="w-full bg-crypto-blue hover:bg-crypto-darkblue">
          <PlusCircle className="h-5 w-5 mr-2" />
          New Message
        </Button>
      </div>
    </div>
  );
};

export default ConversationList;
