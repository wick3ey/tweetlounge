
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/Message';
import { useAuth } from '@/contexts/AuthContext';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const isCurrentUser = user?.id === message.sender_id;
  
  return (
    <div className={`flex items-end space-x-2 mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
        <div 
          className={`px-4 py-3 rounded-2xl 
            ${isCurrentUser 
              ? 'bg-crypto-blue text-white rounded-br-none' 
              : 'bg-crypto-darkgray text-crypto-text rounded-bl-none'
            }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>
        <p className={`text-xs text-crypto-lightgray mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
