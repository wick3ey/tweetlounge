
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Message } from '@/types/Message';

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  sender_id: string | null;
  other_user_id: string;
  other_user_username: string | null;
  other_user_display_name: string | null;
  other_user_avatar: string | null;
  other_user_avatar_nft_id: string | null;
  other_user_avatar_nft_chain: string | null;
  other_user_bio: string | null;
}

export const useRealtimeConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching conversations for user:', user.id);
        
        // Use the new database function to get conversations
        const { data, error } = await supabase
          .rpc('get_user_conversations', { user_uuid: user.id });
          
        if (error) {
          console.error('Error fetching conversations:', error);
          throw error;
        }
        
        console.log('Received conversations:', data);
        
        if (!data || data.length === 0) {
          console.log('No conversations found');
          setConversations([]);
          setLoading(false);
          return;
        }
        
        // Map the data to our Conversation interface
        const formattedConversations = data.map(conv => ({
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count,
          sender_id: conv.sender_id,
          other_user_id: conv.other_user_id,
          other_user_username: conv.other_user_username,
          other_user_display_name: conv.other_user_display_name,
          other_user_avatar: conv.other_user_avatar,
          other_user_avatar_nft_id: conv.other_user_avatar_nft_id,
          other_user_avatar_nft_chain: conv.other_user_avatar_nft_chain,
          other_user_bio: conv.other_user_bio
        }));
        
        console.log('Formatted conversations:', formattedConversations);
        setConversations(formattedConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: "Error loading conversations",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time listener with improved filters and handling
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: user ? `sender_id=eq.${user.id}` : undefined
        },
        (payload) => {
          console.log('New message sent by current user:', payload);
          fetchConversations(); // Immediate update when user sends a message
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: user ? `sender_id=neq.${user.id}` : undefined
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Get conversation ID from the new message
          const newMessage = payload.new as Message;
          const conversationId = newMessage.conversation_id;
          
          // Optimistically update the conversation list
          const updatedConversations = [...conversations];
          const conversationIndex = updatedConversations.findIndex(c => c.id === conversationId);
          
          if (conversationIndex !== -1) {
            // Only update if the conversation already exists in the list
            const conversation = {...updatedConversations[conversationIndex]};
            
            // Update last_message and unread_count
            conversation.last_message = newMessage.content;
            conversation.last_message_time = newMessage.created_at;
            conversation.sender_id = newMessage.sender_id;
            
            if (newMessage.sender_id !== user.id) {
              conversation.unread_count = (conversation.unread_count || 0) + 1;
            }
            
            // Remove the old conversation from the list
            updatedConversations.splice(conversationIndex, 1);
            
            // Add the updated conversation first in the list
            setConversations([conversation, ...updatedConversations]);
          } else {
            // If the conversation isn't in the list, fetch all conversations
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        (payload) => {
          console.log('User added to conversation:', payload);
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Clean up on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return { conversations, loading };
};
