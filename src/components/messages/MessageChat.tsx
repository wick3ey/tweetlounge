
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { createMessage, deleteMessage, markConversationAsRead } from '@/services/messageService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Check, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/components/ui/use-toast';
import { format, isSameDay } from 'date-fns';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import MessageReactions from './MessageReactions';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

interface MessageProps {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  created_at: string;
  is_deleted: boolean;
}

interface MessageChatProps {
  conversationId: string;
}

const MessageChat: React.FC<MessageChatProps> = ({ conversationId }) => {
  const { messages, loading, error } = useRealtimeMessages(conversationId);
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loadingOtherUser, setLoadingOtherUser] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to scroll to the bottom of the chat
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark conversation as read when entering
  useEffect(() => {
    if (conversationId && user) {
      markConversationAsRead(conversationId)
        .catch(err => console.error('Error marking conversation as read:', err));
    }
  }, [conversationId, user]);

  // Fetch the other user's profile
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!conversationId || !user) return;
      
      try {
        setLoadingOtherUser(true);
        
        // First get the other participant's ID
        const { data: participantData, error: participantError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .single();
          
        if (participantError) {
          console.error('Error fetching other participant:', participantError);
          return;
        }
        
        if (!participantData) {
          console.error('No other participant found');
          return;
        }
        
        // Then get their profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', participantData.user_id)
          .single();
          
        if (profileError) {
          console.error('Error fetching other user profile:', profileError);
          return;
        }
        
        setOtherUser(profileData);
      } catch (error) {
        console.error('Error fetching other user:', error);
      } finally {
        setLoadingOtherUser(false);
      }
    };
    
    fetchOtherUser();
  }, [conversationId, user]);

  // Scroll to bottom on initial load and when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await createMessage(conversationId, newMessage);
      setNewMessage('');
      scrollToBottom();
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    } catch (err: any) {
      console.error('Error deleting message:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  };

  const groupMessagesByDate = () => {
    const groupedMessages: { [key: string]: MessageProps[] } = {};

    messages.forEach(message => {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groupedMessages[date]) {
        groupedMessages[date] = [];
      }
      groupedMessages[date].push(message);
    });

    return groupedMessages;
  };

  const groupedMessages = groupMessagesByDate();

  const handleBackToList = () => {
    navigate('/messages');
  };

  // Loading state for the chat
  if (loading || loadingOtherUser) {
    return (
      <div className="flex flex-col h-full p-4">
        {/* User header skeleton */}
        <div className="flex items-center border-b border-crypto-gray pb-3 mb-4">
          {isMobile && (
            <Button variant="ghost" size="icon" className="mr-2" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Skeleton className="h-10 w-10 rounded-full mr-3" />
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start mb-4">
              <Skeleton className="h-10 w-10 rounded-full mr-3" />
              <div>
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        
        <div className="mt-4">
          <div className="relative">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-crypto-lightgray">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* User profile header */}
      {otherUser && (
        <div className="flex items-center p-4 border-b border-crypto-gray">
          {isMobile && (
            <Button variant="ghost" size="icon" className="mr-2" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={otherUser.avatar_url || ''} />
            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
              {otherUser.display_name?.[0]?.toUpperCase() || 
               otherUser.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{otherUser.display_name || otherUser.username}</p>
            <p className="text-sm text-crypto-lightgray truncate max-w-[250px]">
              {otherUser.bio || `@${otherUser.username}`}
            </p>
          </div>
        </div>
      )}
      
      <div className="flex-grow overflow-y-auto p-4">
        {Object.entries(groupedMessages).map(([date, messagesForDate]) => (
          <div key={date}>
            <div className="text-center text-crypto-lightgray py-2">
              {isSameDay(new Date(date), new Date())
                ? 'Today'
                : format(new Date(date), 'MMMM dd, yyyy')}
            </div>
            {messagesForDate.map(message => (
              <div key={message.id} className="flex items-start mb-4">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={message.sender_avatar || ''} />
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                    {message.sender_name?.[0]?.toUpperCase() || message.sender_username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold">{message.sender_name || message.sender_username || 'Unknown'}</p>
                    <span className="text-xs text-crypto-lightgray">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </span>
                    {message.sender_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                            <Trash2 className="h-4 w-4 text-crypto-lightgray hover:text-red-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-crypto-darkgray border-crypto-gray">
                          <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)} className="focus:bg-crypto-black text-red-500">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className={`rounded-lg px-3 py-2 break-words ${message.is_deleted ? 'italic text-crypto-lightgray' : 'bg-crypto-darkgray'}`}>
                    {message.is_deleted ? 'This message was deleted' : message.content}
                    {!message.is_deleted && (
                      <MessageReactions messageId={message.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="bg-crypto-black border-crypto-gray pr-12"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            className="absolute right-1 top-1 rounded-full p-2 bg-crypto-blue hover:bg-crypto-blue/80"
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageChat;
