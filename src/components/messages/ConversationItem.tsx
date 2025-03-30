
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '@/types/Message';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { truncate } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
}

const ConversationItem = ({ conversation }: ConversationItemProps) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/messages/${conversation.id}`);
  };
  
  // Get the user's initials for avatar fallback
  const getInitials = () => {
    if (conversation.other_user_display_name) {
      return conversation.other_user_display_name.substring(0, 2).toUpperCase();
    } else if (conversation.other_user_username) {
      return conversation.other_user_username.substring(0, 2).toUpperCase();
    }
    return 'UN';
  };
  
  return (
    <div 
      onClick={handleClick}
      className={`flex items-center p-4 border-b border-crypto-gray cursor-pointer hover:bg-crypto-darkgray/30 transition-colors
        ${conversation.unread_count > 0 ? 'bg-crypto-darkgray/20' : ''}`}
    >
      <Avatar className="h-12 w-12 mr-3">
        {conversation.other_user_avatar ? (
          <AvatarImage src={conversation.other_user_avatar} />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-crypto-blue/30 to-purple-500/30">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-crypto-text">
            {conversation.other_user_display_name || conversation.other_user_username}
          </h3>
          {conversation.last_message_time && (
            <span className="text-xs text-crypto-lightgray">
              {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-crypto-lightgray truncate">
            {truncate(conversation.last_message || 'New conversation', 30)}
          </p>
          
          {conversation.unread_count > 0 && (
            <span className="bg-crypto-blue text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
