
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getMessages, createMessage, Message } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MessageChat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;

      try {
        setLoading(true);
        const fetchedMessages = await getMessages(conversationId);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Failed to fetch messages', error);
        toast({
          title: 'Error',
          description: 'Could not load messages',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      const sentMessage = await createMessage(conversationId, newMessage);
      
      if (sentMessage) {
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message', error);
      toast({
        title: 'Error',
        description: 'Could not send message',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-3 rounded-lg ${
                message.sender_id === user?.id 
                  ? 'bg-crypto-blue text-white' 
                  : 'bg-crypto-darkgray text-crypto-text'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-crypto-gray p-4 flex items-center space-x-2">
        <Input 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-grow"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={!newMessage.trim()}
          className="bg-crypto-blue hover:bg-crypto-darkblue"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MessageChat;
