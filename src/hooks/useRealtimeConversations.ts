
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
        
        // Fall back to simpler query if RPC function fails
        let data;
        let error;

        try {
          // First try to use the RPC function
          const result = await supabase
            .rpc('get_user_conversations', { user_uuid: user.id });
          
          data = result.data;
          error = result.error;
          
          // If we get an error, log it for debugging but don't throw yet
          if (error) {
            console.error('Error with RPC get_user_conversations:', error);
          }
        } catch (rpcError) {
          console.error('Exception calling get_user_conversations RPC:', rpcError);
          error = rpcError;
        }

        // If RPC failed or returned no data, use a fallback query
        if (error || !data || data.length === 0) {
          console.log('Falling back to direct query for conversations');
          
          // Get conversations the user is part of
          const { data: participantsData, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            throw participantsError;
          }

          if (!participantsData || participantsData.length === 0) {
            console.log('No conversations found via participants table');
            setConversations([]);
            setLoading(false);
            return;
          }

          const conversationIds = participantsData.map(p => p.conversation_id);

          // Get all conversations data
          const { data: conversationsData, error: conversationsError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds)
            .order('updated_at', { ascending: false });

          if (conversationsError) {
            console.error('Error fetching conversations:', conversationsError);
            throw conversationsError;
          }

          console.log('Fetched conversations data:', conversationsData);
          
          // Map to simplified model for now (losing some info but will be functional)
          const basicConversations = [];
          
          for (const conv of conversationsData) {
            // For each conversation, get the other participant
            const { data: otherParticipant } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id)
              .single();
              
            if (!otherParticipant) continue;
            
            // Get profile info for the other user
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipant.user_id)
              .single();
              
            if (!profile) continue;
            
            // Get the latest message
            const { data: latestMessage } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
              
            basicConversations.push({
              id: conv.id,
              created_at: conv.created_at,
              updated_at: conv.updated_at,
              last_message: latestMessage?.content || null,
              last_message_time: latestMessage?.created_at || null,
              unread_count: 0, // Would need a more complex query to get this
              sender_id: latestMessage?.sender_id || null,
              other_user_id: profile.id,
              other_user_username: profile.username,
              other_user_display_name: profile.display_name,
              other_user_avatar: profile.avatar_url,
              other_user_avatar_nft_id: profile.avatar_nft_id,
              other_user_avatar_nft_chain: profile.avatar_nft_chain,
              other_user_bio: profile.bio
            });
          }
          
          data = basicConversations;
        }
        
        console.log('Final conversations data:', data);
        setConversations(data || []);
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
