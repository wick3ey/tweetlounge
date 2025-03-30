
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  const { user } = useAuth();

  useEffect(() => {
    if (!messageId) {
      setReactions([]);
      setLoading(false);
      return;
    }

    const fetchReactions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', messageId);

        if (error) {
          throw error;
        }

        setReactions(data || []);
      } catch (error) {
        console.error('Error fetching message reactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();

    // Set up real-time listener for reactions
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          setReactions(current => [...current, payload.new as MessageReaction]);
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
          setReactions(current => 
            current.filter(reaction => reaction.id !== (payload.old as MessageReaction).id)
          );
        }
      )
      .subscribe();

    // Clean up on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const toggleReaction = async (reactionType: string) => {
    if (!user || !messageId) {
      throw new Error('You must be logged in to react to messages');
    }

    try {
      // Check if the user already has this reaction
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove the reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add the reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction_type: reactionType
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  };

  return { reactions, loading, toggleReaction };
};
