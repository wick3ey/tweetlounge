
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ConversationList from '@/components/messages/ConversationList';
import MessageChat from '@/components/messages/MessageChat';
import { MessageSquareText, Info } from 'lucide-react';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, loading } = useRealtimeConversations();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationId || null);

  // Debug conversations
  useEffect(() => {
    console.log('Conversations in Messages.tsx:', conversations);
  }, [conversations]);

  // Set selected conversation when route parameter changes
  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [conversationId]);

  // For mobile: If we have conversations but none selected, redirect to first one
  useEffect(() => {
    if (isMobile && !selectedConversationId && !loading && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
      navigate(`/messages/${conversations[0].id}`);
    }
  }, [isMobile, selectedConversationId, loading, conversations, navigate]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (isMobile) {
      navigate(`/messages/${id}`);
    }
  };

  // Show login prompt if no user
  if (!user) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center bg-crypto-black text-crypto-text">
          <div className="text-center p-8">
            <Info className="h-16 w-16 mx-auto mb-4 text-crypto-lightgray" />
            <h2 className="text-2xl font-bold mb-4">You need to be logged in</h2>
            <p className="text-crypto-lightgray mb-6">Please sign in to view your messages</p>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-crypto-blue text-white rounded-lg hover:bg-crypto-blue/80"
            >
              Go to Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-screen bg-crypto-black text-crypto-text">
        {/* Conversation list (left sidebar) - hide on mobile when viewing a conversation */}
        {(!isMobile || !selectedConversationId) && (
          <div className={`${isMobile ? 'w-full' : 'w-1/3'} border-r border-crypto-gray`}>
            <ConversationList 
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        )}
        
        {/* Chat or placeholder (main content) - full width on mobile */}
        {(!isMobile || selectedConversationId) && (
          <div className={`${isMobile ? 'w-full' : 'w-2/3'} flex flex-col h-full`}>
            {selectedConversationId ? (
              <MessageChat conversationId={selectedConversationId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-crypto-lightgray">
                <div className="text-center p-8">
                  <MessageSquareText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h2 className="text-2xl font-bold mb-4">Select a Conversation</h2>
                  <p>Choose a conversation from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
