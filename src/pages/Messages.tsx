
import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ConversationList from '@/components/messages/ConversationList';
import MessageChat from '@/components/messages/MessageChat';

const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <Layout>
      <div className="flex h-screen bg-crypto-black text-crypto-text">
        {/* Conversation list (left sidebar) */}
        <div className="w-1/3 border-r border-crypto-gray">
          <ConversationList />
        </div>
        
        {/* Chat or placeholder (main content) */}
        <div className="w-2/3">
          {conversationId ? (
            <MessageChat />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-crypto-lightgray">
              <div className="text-center p-8">
                <h2 className="text-2xl font-bold mb-4">Select a Conversation</h2>
                <p>Choose a conversation from the list or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
