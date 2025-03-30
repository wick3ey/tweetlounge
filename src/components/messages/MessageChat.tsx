import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  createMessage, 
  searchMessages, 
  markConversationAsRead, 
  deleteMessage 
} from '@/services/messageService';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Search, 
  X, 
  Trash2, 
  MoreVertical,
  Smile,
  Info,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MessageReactions from './MessageReactions';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { VerifiedBadge } from '@/components/ui/badge';
import { useProfile } from '@/contexts/ProfileContext';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const MessageChat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Use our custom hook for real-time messages
  const { messages, loading, error } = useRealtimeMessages(conversationId || '');

  // Get conversation data from the messages
  const otherUser = messages.length > 0 && messages[0].sender_id !== user?.id
    ? { id: messages[0].sender_id }
    : messages.length > 0 
      ? { id: messages.find(m => m.sender_id !== user?.id)?.sender_id }
      : null;

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  // Format message date for groups
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    // If today, show "Today"
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise, show the date
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: {[key: string]: typeof messages} = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    // Sort groups by date
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([date, messages]) => ({
        date,
        messages
      }));
  };

  const messageGroups = groupMessagesByDate();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      markConversationAsRead(conversationId).catch(console.error);
    }
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await createMessage(conversationId, newMessage);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message', error);
      toast({
        title: 'Error',
        description: 'Could not send message',
        variant: 'destructive'
      });
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !conversationId) return;

    try {
      setIsSearching(true);
      const result = await searchMessages(conversationId, searchTerm);
      setSearchResults(result.messages);
    } catch (error) {
      console.error('Failed to search messages', error);
      toast({
        title: 'Error',
        description: 'Could not search messages',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    } catch (error) {
      console.error('Failed to delete message', error);
      toast({
        title: 'Error',
        description: 'Could not delete message',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-crypto-gray p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-crypto-darkgray animate-pulse"></div>
            <div className="ml-3">
              <div className="h-5 w-32 bg-crypto-darkgray animate-pulse rounded"></div>
              <div className="h-4 w-24 bg-crypto-darkgray animate-pulse rounded mt-1"></div>
            </div>
          </div>
        </div>
        <div className="flex-grow p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-start max-w-[70%]">
                  {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-crypto-darkgray animate-pulse mr-2"></div>}
                  <div className={`p-3 rounded-lg ${i % 2 === 0 ? 'bg-crypto-darkgray' : 'bg-crypto-darkgray'} animate-pulse h-16 w-48`}></div>
                  {i % 2 === 0 && <div className="h-8 w-8 rounded-full bg-crypto-darkgray animate-pulse ml-2"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-crypto-gray p-4">
          <div className="h-10 bg-crypto-darkgray animate-pulse rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-500">Error loading messages</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with user info */}
      <div className="border-b border-crypto-gray p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/messages')}
            className="mr-2 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {otherUser && (
            <Link to={`/profile/${otherUser.id}`} className="flex items-center hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                <AvatarImage src={messages[0]?.sender_id !== user?.id 
                  ? messages[0]?.sender_avatar || ''
                  : messages.find(m => m.sender_id !== user?.id)?.sender_avatar || ''
                } />
                <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                  {messages[0]?.sender_id !== user?.id 
                    ? messages[0]?.sender_name?.[0] || '?'
                    : messages.find(m => m.sender_id !== user?.id)?.sender_name?.[0] || '?'
                  }
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="flex items-center">
                  <h2 className="font-bold text-lg">
                    {messages[0]?.sender_id !== user?.id 
                      ? messages[0]?.sender_name
                      : messages.find(m => m.sender_id !== user?.id)?.sender_name
                    }
                  </h2>
                  <VerifiedBadge className="ml-1" />
                </div>
                <div className="text-sm text-crypto-lightgray">
                  @{messages[0]?.sender_id !== user?.id 
                    ? messages[0]?.sender_username
                    : messages.find(m => m.sender_id !== user?.id)?.sender_username
                  }
                </div>
              </div>
            </Link>
          )}
        </div>
        <Button variant="ghost" size="icon">
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* Search bar (conditionally rendered) */}
      {showSearch && (
        <div className="border-b border-crypto-gray p-2 flex items-center">
          <Input 
            placeholder="Search in conversation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-grow"
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSearch} 
            disabled={isSearching || !searchTerm.trim()}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setShowSearch(false);
              setSearchTerm('');
              setSearchResults([]);
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Search results (conditionally rendered) */}
      {searchResults.length > 0 && (
        <div className="border-b border-crypto-gray bg-crypto-darkgray p-4">
          <h3 className="text-sm font-semibold mb-2">Search Results ({searchResults.length})</h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.map(message => (
              <div 
                key={message.id} 
                className="p-2 rounded bg-crypto-black hover:bg-crypto-darkgray cursor-pointer"
                onClick={() => {
                  // Find the message element and scroll to it
                  const element = document.getElementById(`message-${message.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    element.classList.add('bg-crypto-blue/10');
                    setTimeout(() => {
                      element.classList.remove('bg-crypto-blue/10');
                    }, 2000);
                  }
                }}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-crypto-lightgray">
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchResults([])} 
            className="mt-2"
          >
            Clear Results
          </Button>
        </div>
      )}

      {/* Messages container */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        {messageGroups.map(group => (
          <div key={group.date} className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-crypto-darkgray px-4 py-1 rounded-full text-xs text-crypto-lightgray">
                {formatMessageDate(group.date)}
              </div>
            </div>
            
            {group.messages.map((message, index) => {
              const showAvatar = index === 0 || 
                group.messages[index - 1].sender_id !== message.sender_id ||
                new Date(message.created_at).getTime() - new Date(group.messages[index - 1].created_at).getTime() > 5 * 60 * 1000;
              
              const isCurrentUser = message.sender_id === user?.id;
              
              return (
                <div 
                  key={message.id} 
                  id={`message-${message.id}`}
                  className={`flex transition-colors duration-300 ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  } ${
                    !showAvatar && !isCurrentUser ? 'pl-12' : ''
                  }`}
                >
                  <div className={`max-w-[70%] ${showAvatar ? '' : 'mt-1'}`}>
                    <div className="flex items-start gap-2">
                      {!isCurrentUser && showAvatar && (
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarImage src={message.sender_avatar || ''} />
                          <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                            {message.sender_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex flex-col">
                        {!isCurrentUser && showAvatar && (
                          <span className="text-xs text-crypto-lightgray mb-1">
                            {message.sender_name}
                          </span>
                        )}
                        <div className="flex items-start">
                          <div 
                            className={`p-3 ${
                              message.is_deleted 
                                ? 'bg-crypto-darkgray text-crypto-lightgray italic' 
                                : isCurrentUser 
                                  ? 'bg-crypto-blue text-white rounded-2xl rounded-tr-sm' 
                                  : 'bg-crypto-darkgray text-crypto-text rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {message.is_deleted 
                              ? 'This message was deleted' 
                              : message.content
                            }
                          </div>

                          {!message.is_deleted && isCurrentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 ml-1 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        {!message.is_deleted && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-crypto-lightgray">
                              {formatMessageTime(message.created_at)}
                            </span>
                            <MessageReactions messageId={message.id} compact />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="border-t border-crypto-gray p-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSearch(!showSearch)}
            className="flex-shrink-0"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Input 
            placeholder="Start a new message" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-grow rounded-full bg-crypto-darkgray border-none"
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-8 gap-2">
                {['😀', '😂', '😍', '🥰', '😘', '🤔', '😎', '🥳', 
                  '😊', '🙂', '🤩', '😢', '😭', '😡', '👍', '👎',
                  '❤️', '🔥', '💯', '👏', '🙌', '🤝', '🤷‍♂️', '🎉'].map(emoji => (
                  <Button 
                    key={emoji} 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => setNewMessage(current => current + emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim()}
            className="bg-crypto-blue hover:bg-crypto-darkblue flex-shrink-0 rounded-full aspect-square p-0 w-10 h-10"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageChat;
