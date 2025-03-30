
import React, { useState } from 'react';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';

interface MessageReactionsProps {
  messageId: string;
  compact?: boolean;
  displayOnly?: boolean;
  emoji?: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ 
  messageId, 
  compact = false,
  displayOnly = false,
  emoji
}) => {
  const { reactions, toggleReaction } = useMessageReactions(messageId);
  const [showReactions, setShowReactions] = useState(false);
  const { user } = useAuth();
  
  // Count reactions by type
  const reactionCounts = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction_type]) {
      acc[reaction.reaction_type] = {
        count: 0,
        users: [],
        hasReacted: false
      };
    }
    
    acc[reaction.reaction_type].count += 1;
    acc[reaction.reaction_type].users.push(reaction.user_id);
    
    if (user && reaction.user_id === user.id) {
      acc[reaction.reaction_type].hasReacted = true;
    }
    
    return acc;
  }, {} as Record<string, { count: number, users: string[], hasReacted: boolean }>);
  
  // Common reaction emojis
  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  
  const handleReaction = async (reactionType: string) => {
    try {
      await toggleReaction(reactionType);
      setShowReactions(false);
    } catch (error) {
      console.error('Error toggling reaction', error);
    }
  };
  
  // If this is just for display with a specific emoji, render that
  if (displayOnly && emoji) {
    return <div className="text-4xl">{emoji}</div>;
  }
  
  // If no reactions and compact mode, show minimal UI
  if (Object.keys(reactionCounts).length === 0 && compact) {
    return (
      <Popover open={showReactions} onOpenChange={setShowReactions}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-1.5 text-xs text-crypto-lightgray hover:text-crypto-text hover:bg-transparent"
          >
            <SmilePlus className="h-3.5 w-3.5 mr-1" />
            React
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {commonReactions.map(reaction => (
              <Button
                key={reaction}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleReaction(reaction)}
              >
                {reaction}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  return (
    <div className={`flex items-center gap-1 ${compact ? 'ml-2' : 'mt-1'}`}>
      {Object.entries(reactionCounts).map(([reaction, data]) => (
        <Button
          key={reaction}
          variant={data.hasReacted ? "secondary" : "outline"}
          size="sm"
          className={`
            h-6 px-1.5 rounded-full text-xs
            ${data.hasReacted 
              ? 'bg-crypto-blue/20 text-crypto-blue hover:bg-crypto-blue/30 border-none' 
              : 'bg-transparent hover:bg-crypto-gray/20 border-crypto-gray/50'
            }
          `}
          onClick={() => handleReaction(reaction)}
        >
          {reaction} {data.count}
        </Button>
      ))}
      
      {!compact && (
        <Popover open={showReactions} onOpenChange={setShowReactions}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-transparent hover:bg-crypto-gray/20 border-crypto-gray/50"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1">
              {commonReactions.map(reaction => (
                <Button
                  key={reaction}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleReaction(reaction)}
                >
                  {reaction}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default MessageReactions;
