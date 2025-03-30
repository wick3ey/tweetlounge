
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addMessageReaction, removeMessageReaction, getMessageReactions } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Group reactions by type
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction_type]) {
      acc[reaction.reaction_type] = { count: 0, userReacted: false };
    }
    acc[reaction.reaction_type].count++;
    if (user && reaction.user_id === user.id) {
      acc[reaction.reaction_type].userReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; userReacted: boolean }>);

  // Get reactions for a message
  useEffect(() => {
    if (!messageId) {
      setReactions([]);
      setLoading(false);
      return;
    }

    const fetchReactions = async () => {
      try {
        const reactionsData = await getMessageReactions(messageId);
        setReactions(reactionsData);
      } catch (err) {
        console.error('Error fetching message reactions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch reactions'));
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();

    // Set up real-time listener
    const channel = supabase
      .channel('message-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          // Refetch reactions on any change
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  // Toggle a reaction
  const toggleReaction = async (reactionType: string) => {
    if (!messageId || !user) return;

    try {
      // Check if user already reacted with this type
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove reaction
        await removeMessageReaction(messageId, reactionType);
      } else {
        // Add reaction
        await addMessageReaction(messageId, reactionType);
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  return { reactions, groupedReactions, loading, error, toggleReaction };
};
