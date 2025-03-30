
import React from 'react';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// Define standard reaction types
const REACTION_TYPES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
  const { reactions, loading, toggleReaction } = useMessageReactions(messageId);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReaction = async (reactionType: string) => {
    if (displayOnly) return;
    
    try {
      await toggleReaction(reactionType);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        title: 'Error',
        description: 'Could not add reaction',
        variant: 'destructive'
      });
    }
  };

  // Group reactions by type and count them
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check which reactions the current user has added
  const userReactions = user 
    ? reactions
        .filter(r => r.user_id === user.id)
        .map(r => r.reaction_type)
    : [];

  if (loading) return null;

  if (displayOnly && emoji) {
    return (
      <div className="text-4xl">{emoji}</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {compact ? (
        // Compact view only shows reactions that exist
        Object.entries(reactionCounts).map(([type, count]) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className={`h-6 px-2 rounded-full text-xs ${userReactions.includes(type) ? 'bg-crypto-blue/20' : ''}`}
            onClick={() => handleReaction(type)}
          >
            {type} {count}
          </Button>
        ))
      ) : (
        // Full view shows all possible reactions
        REACTION_TYPES.map(type => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className={`h-8 px-2 rounded-full ${userReactions.includes(type) ? 'bg-crypto-blue/20' : ''}`}
            onClick={() => handleReaction(type)}
          >
            {type} {reactionCounts[type] ? reactionCounts[type] : ''}
          </Button>
        ))
      )}
    </div>
  );
};

export default MessageReactions;
