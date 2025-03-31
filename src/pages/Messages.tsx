
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ConversationList from '@/components/messages/ConversationList';
import MessageChat from '@/components/messages/MessageChat';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { Loader2 } from 'lucide-react';

const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, loading } = useRealtimeConversations();
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(!conversationId || !isMobileView);
  const navigate = useNavigate();

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      
      // On desktop, always show sidebar
      // On mobile, show sidebar only when no conversation is selected
      setShowSidebar(!mobile || !conversationId);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [conversationId]);

  // Effect to handle when conversation changes
  useEffect(() => {
    if (isMobileView && conversationId) {
      setShowSidebar(false);
    }
  }, [conversationId, isMobileView]);

  const handleBackToList = () => {
    if (isMobileView) {
      navigate('/messages');
      setShowSidebar(true);
    }
  };

  const handleConversationSelect = (id: string) => {
    navigate(`/messages/${id}`);
    if (isMobileView) {
      setShowSidebar(false);
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-crypto-black text-crypto-text">
        {/* Conversation list (left sidebar) */}
        {showSidebar && (
          <div className={`${isMobileView ? 'w-full' : 'w-1/3'} border-r border-crypto-gray`}>
            <ConversationList 
              conversations={conversations} 
              loading={loading}
              selectedConversationId={conversationId}
              onSelectConversation={handleConversationSelect}
            />
          </div>
        )}
        
        {/* Chat or placeholder (main content) */}
        {(!isMobileView || !showSidebar) && (
          <div className={`${isMobileView ? 'w-full' : 'w-2/3'}`}>
            {conversationId ? (
              <MessageChat onBackClick={isMobileView ? handleBackToList : undefined} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-crypto-lightgray">
                <div className="text-center p-8">
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
