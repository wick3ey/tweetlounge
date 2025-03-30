
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageReaction, 
  getMessageReactions, 
  addMessageReaction, 
  removeMessageReaction 
} from '@/services/messageService';

export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial fetch of reactions
    const fetchReactions = async () => {
      try {
        const reactionsData = await getMessageReactions(messageId);
        setReactions(reactionsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch message reactions'));
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();

    // Set up real-time listener for reactions
    const channel = supabase
      .channel('message-reactions-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          const newReaction = payload.new as MessageReaction;
          setReactions(currentReactions => [...currentReactions, newReaction]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          const deletedReaction = payload.old as MessageReaction;
          setReactions(currentReactions => 
            currentReactions.filter(r => r.id !== deletedReaction.id)
          );
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const toggleReaction = async (reactionType: string) => {
    // Check if user already has this reaction
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User must be logged in to react to messages');
    }
    
    const existingReaction = reactions.find(r => 
      r.user_id === userData.user.id && r.reaction_type === reactionType
    );

    if (existingReaction) {
      // Remove reaction if it exists
      await removeMessageReaction(messageId, reactionType);
    } else {
      // Add reaction if it doesn't exist
      await addMessageReaction(messageId, reactionType);
    }
  };

  return { 
    reactions, 
    loading, 
    error, 
    toggleReaction 
  };
};
