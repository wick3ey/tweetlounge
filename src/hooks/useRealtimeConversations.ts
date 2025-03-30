
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Conversation, getConversations } from '@/services/messageService';

export const useRealtimeConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial fetch of conversations
    const fetchConversations = async () => {
      try {
        const conversationsData = await getConversations();
        setConversations(conversationsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time listener for conversations
    const channel = supabase
      .channel('conversations-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          // Refetch all conversations when any conversation is updated
          // This is simpler than trying to update just one conversation
          // since we need associated data like participants and last message
          fetchConversations();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { conversations, loading, error };
};
