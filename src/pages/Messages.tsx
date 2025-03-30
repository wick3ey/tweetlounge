
import React from 'react';
import Layout from '@/components/layout/Layout';
import ConversationList from '@/components/messages/ConversationList';

const Messages: React.FC = () => {
  return (
    <Layout>
      <div className="bg-crypto-black min-h-screen text-crypto-text">
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-6 text-crypto-blue">Messages</h1>
          <ConversationList />
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
