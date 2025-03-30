
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, sendMessage, markConversationAsRead } from '@/services/messageService';
import { Message, Conversation } from '@/types/Message';
import Layout from '@/components/layout/Layout';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ConversationView = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const messagesData = await getMessages(conversationId);
      setMessages(messagesData);
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, toast]);
  
  const fetchConversationDetails = useCallback(async () => {
    if (!conversationId || !user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_conversations');
      
      if (error) {
        throw error;
      }
      
      const foundConversation = data.find((c: Conversation) => c.id === conversationId);
      if (foundConversation) {
        setConversation(foundConversation);
      } else {
        toast({
          title: "Error",
          description: "Conversation not found",
          variant: "destructive",
        });
        navigate('/messages');
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation details",
        variant: "destructive",
      });
    }
  }, [conversationId, user, navigate, toast]);
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchConversationDetails();
    fetchMessages();
    
    // Set up real-time updates
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // @ts-ignore
          const newMessage = payload.new as Message;
          setMessages((current) => [...current, newMessage]);
          markConversationAsRead(conversationId as string);
        }
      )
      .subscribe();
    
    // Clean up
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId, navigate, fetchMessages, fetchConversationDetails]);
  
  const handleSendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return;
    
    setIsSending(true);
    try {
      const result = await sendMessage(conversationId, content);
      if (!result) {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const getInitials = () => {
    if (!conversation) return 'UN';
    
    if (conversation.other_user_display_name) {
      return conversation.other_user_display_name.substring(0, 2).toUpperCase();
    } else if (conversation.other_user_username) {
      return conversation.other_user_username.substring(0, 2).toUpperCase();
    }
    return 'UN';
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-gray-800 p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            {conversation ? (
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  {conversation.other_user_avatar ? (
                    <AvatarImage src={conversation.other_user_avatar} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-crypto-blue/30 to-purple-500/30">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-bold">
                    {conversation.other_user_display_name || conversation.other_user_username}
                  </h1>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Messages */}
        <MessageList messages={messages} isLoading={isLoading} />
        
        {/* Input */}
        <MessageInput onSendMessage={handleSendMessage} isLoading={isSending} />
      </div>
    </Layout>
  );
};

export default ConversationView;
