
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, MessageSquare, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations } from '@/services/messageService';
import { Conversation } from '@/types/Message';
import ConversationItem from '@/components/messages/ConversationItem';
import { Button } from '@/components/ui/button';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const data = await getConversations();
        setConversations(data);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
    
    // Set up polling to refresh conversations
    const interval = setInterval(fetchConversations, 10000); // every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-crypto-blue" />
              Messages
            </h1>
          </div>
        </div>
        
        {/* Conversations List */}
        <div className="divide-y divide-crypto-gray">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
              <span className="ml-2 text-gray-400">Loading conversations...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No messages yet</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Visit user profiles and click the message button to start a conversation
              </p>
            </div>
          ) : (
            <>
              {conversations.map((conversation) => (
                <ConversationItem 
                  key={conversation.id} 
                  conversation={conversation} 
                />
              ))}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
