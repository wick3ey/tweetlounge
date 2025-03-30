
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  unread_count: number;
  other_user_id: string;
  other_user_username: string | null;
  other_user_display_name: string | null;
  other_user_avatar: string | null;
  other_user_avatar_nft_id: string | null;
  other_user_avatar_nft_chain: string | null;
  sender_id: string | null;
}

export const useRealtimeConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Get all conversation IDs where the current user is a participant
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id, is_read, last_read_at')
          .eq('user_id', user.id);
          
        if (participantsError) throw participantsError;
        
        if (!participantsData || participantsData.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }
        
        // Extract conversation IDs
        const conversationIds = participantsData.map(p => p.conversation_id);
        
        // Create a map of conversation_id to is_read status
        const readStatusMap = participantsData.reduce((acc, curr) => {
          acc[curr.conversation_id] = {
            is_read: curr.is_read,
            last_read_at: curr.last_read_at
          };
          return acc;
        }, {} as Record<string, { is_read: boolean, last_read_at: string | null }>);
        
        // Get conversations with basic details
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });
          
        if (conversationsError) throw conversationsError;
        
        // Get other participants for each conversation
        const enhancedConversations = await Promise.all(
          conversationsData.map(async (conversation) => {
            // Get the other participant in this conversation
            const { data: otherParticipant, error: participantError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conversation.id)
              .neq('user_id', user.id)
              .single();
              
            if (participantError) {
              console.error('Error fetching other participant:', participantError);
              return null;
            }
            
            // Get profile of the other participant
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
              .eq('id', otherParticipant.user_id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              return null;
            }
            
            // Get the last message in this conversation
            const { data: lastMessages, error: messagesError } = await supabase
              .from('messages')
              .select('content, created_at, sender_id, is_deleted')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;
            
            // Calculate unread count
            let unreadCount = 0;
            if (!readStatusMap[conversation.id].is_read) {
              const lastReadAt = readStatusMap[conversation.id].last_read_at;
              
              const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conversation.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastReadAt || '1970-01-01');
                
              if (!countError) {
                unreadCount = count || 0;
              }
            }
            
            return {
              ...conversation,
              last_message: lastMessage?.is_deleted 
                ? 'This message was deleted' 
                : lastMessage?.content || null,
              sender_id: lastMessage?.sender_id || null,
              unread_count: unreadCount,
              other_user_id: otherParticipant.user_id,
              other_user_username: profileData?.username || null,
              other_user_display_name: profileData?.display_name || null,
              other_user_avatar: profileData?.avatar_url || null,
              other_user_avatar_nft_id: profileData?.avatar_nft_id || null,
              other_user_avatar_nft_chain: profileData?.avatar_nft_chain || null
            };
          })
        );
        
        // Filter out null values and sort by updated_at
        const validConversations = enhancedConversations
          .filter(Boolean)
          .sort((a, b) => new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime());
        
        setConversations(validConversations as Conversation[]);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time listener for new messages
    const channel = supabase
      .channel('conversations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Update the conversations when a new message is added or updated
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Update the conversations when a conversation is updated
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
        },
        (payload) => {
          // Update the conversations when participant data changes
          fetchConversations();
        }
      )
      .subscribe();

    // Clean up on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading };
};
