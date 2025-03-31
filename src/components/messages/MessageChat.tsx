
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Send, PaperclipIcon, SmileIcon } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/badge';
import { createMessage, markConversationAsRead } from '@/services/messageService';
import MessageReactions from './MessageReactions';

interface MessageChatProps {
  onBackClick?: () => void;
}

const MessageChat: React.FC<MessageChatProps> = ({ onBackClick }) => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { messages, loading, error } = useRealtimeMessages(conversationId!);
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId && user) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, user]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() !== '' && conversationId) {
      const success = await createMessage(conversationId, newMessage);
      if (success) {
        setNewMessage('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        // Handle error (e.g., show a toast)
        console.error('Failed to send message');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return <div className="flex-1 p-4 overflow-y-auto">Loading messages...</div>;
  }

  if (error) {
    return <div className="flex-1 p-4 overflow-y-auto text-red-500">Error loading messages</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-crypto-gray flex items-center">
        {onBackClick && (
          <Button variant="ghost" size="icon" onClick={onBackClick}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="mr-3 h-8 w-8">
          <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-sm font-semibold">Opponent Name</h3>
          <div className="flex items-center text-xs text-crypto-lightgray">
            <span className="mr-1">@opponentusername</span>
            <VerifiedBadge className="ml-1" />
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
        {messages.map(message => (
          <div 
            key={message.id}
            className={`mb-2 flex flex-col ${message.sender_id === user?.id ? 'items-end' : 'items-start'}`}
          >
            <div className={`rounded-xl px-3 py-2 text-sm max-w-[75%] ${message.sender_id === user?.id ? 'bg-crypto-blue text-white' : 'bg-crypto-darkgray text-crypto-text'}`}>
              {message.is_deleted ? <span className="italic text-crypto-lightgray">This message was deleted</span> : message.content}
            </div>
            <MessageReactions messageId={message.id} />
            <span className="text-xs text-crypto-lightgray mt-1">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-crypto-gray">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <PaperclipIcon className="h-5 w-5 text-crypto-lightgray" />
          </Button>
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow rounded-full"
          />
          <Button variant="ghost" size="icon">
            <SmileIcon className="h-5 w-5 text-crypto-lightgray" />
          </Button>
          <Button onClick={handleSendMessage} className="bg-crypto-blue hover:bg-crypto-darkblue rounded-full">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageChat;
