
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  Smile
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
  
  // Use our custom hook for real-time messages
  const { messages, loading, error } = useRealtimeMessages(conversationId || '');

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
    return <div className="flex-1 flex items-center justify-center">Loading messages...</div>;
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-500">Error loading messages</div>;
  }

  return (
    <div className="flex flex-col h-screen">
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
                  {new Date(message.created_at).toLocaleString()}
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
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div 
            key={message.id} 
            id={`message-${message.id}`}
            className={`flex transition-colors duration-300 ${
              message.sender_id === user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="max-w-[70%]">
              <div className="flex items-start gap-2">
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex flex-col">
                  <div className="flex items-start">
                    <div 
                      className={`p-3 rounded-lg ${
                        message.is_deleted 
                          ? 'bg-crypto-darkgray text-crypto-lightgray italic' 
                          : message.sender_id === user?.id 
                            ? 'bg-crypto-blue text-white' 
                            : 'bg-crypto-darkgray text-crypto-text'
                      }`}
                    >
                      {message.is_deleted 
                        ? 'This message was deleted' 
                        : message.content
                      }
                    </div>

                    {!message.is_deleted && message.sender_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 ml-1"
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
                    <MessageReactions messageId={message.id} compact />
                  )}
                </div>
                
                {message.sender_id === user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
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
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-grow"
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
            className="bg-crypto-blue hover:bg-crypto-darkblue flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageChat;
