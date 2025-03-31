
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Conversation, getConversations } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Memoized fetch function to avoid recreating on each render
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const conversationsData = await getConversations();
      setConversations(conversationsData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle individual conversation updates to avoid full refetches
  const updateConversation = useCallback((updatedConversation: Conversation) => {
    setConversations(prevConversations => {
      const index = prevConversations.findIndex(c => c.id === updatedConversation.id);
      
      if (index === -1) {
        // New conversation, add it to the top
        return [updatedConversation, ...prevConversations];
      } else {
        // Update existing conversation
        const newConversations = [...prevConversations];
        newConversations[index] = updatedConversation;
        
        // Sort by last message time to ensure newest is at top
        return newConversations.sort((a, b) => {
          const dateA = a.last_message_time ? new Date(a.last_message_time) : new Date(a.updated_at);
          const dateB = b.last_message_time ? new Date(b.last_message_time) : new Date(b.updated_at);
          return dateB.getTime() - dateA.getTime();
        });
      }
    });
  }, []);

  useEffect(() => {
    // Initial fetch of conversations
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
        (payload) => {
          // Only refetch the specific conversation that was updated
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const conversationId = payload.new.id as string;
            
            // Get the updated conversation
            supabase
              .rpc('get_user_conversations', { user_uuid: user?.id })
              .then(({ data, error }) => {
                if (error || !data) {
                  console.error('Error fetching updated conversation:', error);
                  return;
                }
                
                const updatedConversation = data.find(c => c.id === conversationId);
                if (updatedConversation) {
                  // Transform the data to match our Conversation type
                  const formattedConversation: Conversation = {
                    id: updatedConversation.id,
                    created_at: updatedConversation.created_at,
                    updated_at: updatedConversation.updated_at,
                    last_message: updatedConversation.last_message,
                    last_message_time: updatedConversation.last_message_time,
                    sender_id: updatedConversation.sender_id,
                    other_user: {
                      id: updatedConversation.other_user_id,
                      username: updatedConversation.other_user_username,
                      display_name: updatedConversation.other_user_display_name,
                      avatar_url: updatedConversation.other_user_avatar,
                      avatar_nft_id: updatedConversation.other_user_avatar_nft_id,
                      avatar_nft_chain: updatedConversation.other_user_avatar_nft_chain,
                      bio: updatedConversation.other_user_bio
                    },
                    unread_count: updatedConversation.unread_count
                  };
                  
                  updateConversation(formattedConversation);
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // When a new message is added, update just the affected conversation
          if (payload.new && typeof payload.new === 'object' && 'conversation_id' in payload.new) {
            const conversationId = payload.new.conversation_id as string;
            
            // Get the updated conversation
            const { data, error } = await supabase
              .rpc('get_user_conversations', { user_uuid: user?.id });
              
            if (error || !data) {
              console.error('Error fetching conversations after new message:', error);
              return;
            }
            
            const updatedConversation = data.find(c => c.id === conversationId);
            if (updatedConversation) {
              // Transform the data to match our Conversation type
              const formattedConversation: Conversation = {
                id: updatedConversation.id,
                created_at: updatedConversation.created_at,
                updated_at: updatedConversation.updated_at,
                last_message: updatedConversation.last_message,
                last_message_time: updatedConversation.last_message_time,
                sender_id: updatedConversation.sender_id,
                other_user: {
                  id: updatedConversation.other_user_id,
                  username: updatedConversation.other_user_username,
                  display_name: updatedConversation.other_user_display_name,
                  avatar_url: updatedConversation.other_user_avatar,
                  avatar_nft_id: updatedConversation.other_user_avatar_nft_id,
                  avatar_nft_chain: updatedConversation.other_user_avatar_nft_chain,
                  bio: updatedConversation.other_user_bio
                },
                unread_count: updatedConversation.unread_count
              };
              
              updateConversation(formattedConversation);
            }
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations, updateConversation]);

  // Function to manually refresh conversations
  const refreshConversations = useCallback(() => {
    return fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, error, refreshConversations };
};
