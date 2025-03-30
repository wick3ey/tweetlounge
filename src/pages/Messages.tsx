
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ConversationList from '@/components/messages/ConversationList';
import MessageChat from '@/components/messages/MessageChat';
import { MessageSquareText, Info } from 'lucide-react';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { useMobile } from '@/hooks/use-mobile';

const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, loading } = useRealtimeConversations();
  const navigate = useNavigate();
  const isMobile = useMobile();

  // For mobile: If we have conversations but none selected, redirect to first one
  useEffect(() => {
    if (isMobile && !conversationId && !loading && conversations.length > 0) {
      navigate(`/messages/${conversations[0].id}`);
    }
  }, [isMobile, conversationId, loading, conversations, navigate]);

  // If mobile and no conversationId, show just the conversation list
  // If mobile and conversationId, show just the message chat
  // If desktop, show both side by side

  return (
    <Layout>
      <div className="flex h-screen bg-crypto-black text-crypto-text">
        {/* Conversation list (left sidebar) - hide on mobile when viewing a conversation */}
        {(!isMobile || !conversationId) && (
          <div className={`${isMobile ? 'w-full' : 'w-1/3'} border-r border-crypto-gray`}>
            <ConversationList />
          </div>
        )}
        
        {/* Chat or placeholder (main content) - full width on mobile */}
        {(!isMobile || conversationId) && (
          <div className={`${isMobile ? 'w-full' : 'w-2/3'} flex flex-col h-full`}>
            {conversationId ? (
              <MessageChat />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-crypto-lightgray">
                <div className="text-center p-8">
                  <MessageSquareText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h2 className="text-2xl font-bold mb-4">Select a Conversation</h2>
                  <p>Choose a conversation from the list or start a new one</p>
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
