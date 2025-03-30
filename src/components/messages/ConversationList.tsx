
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, PlusCircle, Settings, Calendar } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ConversationList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, loading, error } = useRealtimeConversations();
  const { user } = useAuth();
  const { conversationId: activeConversationId } = useParams<{ conversationId?: string }>();
  
  const truncateMessage = (message: string, length = 30) => 
    message.length > length ? message.substring(0, length) + '...' : message;

  const getDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      // Today, show time
      return format(date, 'h:mm a');
    } else if (date.getFullYear() === now.getFullYear()) {
      // This year, show month and day
      return format(date, 'MMM d');
    } else {
      // Different year, show month and year
      return format(date, 'MMM yyyy');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.participants?.[0];
    const displayName = otherUser?.display_name || otherUser?.username || '';
    const username = otherUser?.username || '';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b border-crypto-gray">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="text-crypto-lightgray">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-crypto-lightgray">
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center p-8">
          <div className="animate-pulse flex flex-col w-full space-y-4">
            <div className="h-10 bg-crypto-darkgray rounded w-full"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex space-x-4 p-4">
                <div className="rounded-full bg-crypto-darkgray h-12 w-12"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-crypto-darkgray rounded w-3/4"></div>
                  <div className="h-3 bg-crypto-darkgray rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error loading conversations</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex justify-between items-center border-b border-crypto-gray">
        <h1 className="text-xl font-bold">Messages</h1>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-crypto-lightgray hover:text-crypto-text hover:bg-crypto-darkgray">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-crypto-lightgray hover:text-crypto-text hover:bg-crypto-darkgray">
            <Calendar className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-crypto-lightgray h-4 w-4" />
          <Input
            placeholder="Search Direct Messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-crypto-darkgray border-none"
          />
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
            const otherUser = conv.participants?.[0];
            const isRead = true; // We'll add unread indicator later
            const isActive = conv.id === activeConversationId;
            
            return (
              <Link 
                key={conv.id} 
                to={`/messages/${conv.id}`} 
                className={`block p-4 transition-colors ${
                  isActive 
                    ? 'bg-crypto-blue/10' 
                    : 'hover:bg-crypto-darkgray'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12 rounded-full">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {otherUser?.display_name?.[0] || otherUser?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center max-w-[70%]">
                        <h3 className={`font-medium truncate ${!isRead ? 'text-crypto-blue' : ''}`}>
                          {otherUser?.display_name || otherUser?.username}
                        </h3>
                        {otherUser?.ethereum_address && (
                          <VerifiedBadge className="ml-1 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-crypto-lightgray flex-shrink-0">
                        {conv.updated_at && getDateDisplay(conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate text-crypto-lightgray ${!isRead ? 'text-crypto-text font-medium' : ''}`}>
                        {conv.lastMessage 
                          ? conv.lastMessage.is_deleted 
                            ? <span className="italic">Message was deleted</span>
                            : truncateMessage(conv.lastMessage.content)
                          : 'Start a conversation'
                        }
                      </p>
                      {!isRead && (
                        <Badge variant="default" className="bg-crypto-blue h-2 w-2 rounded-full p-0 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
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
