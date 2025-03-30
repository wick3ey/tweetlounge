
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

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
  other_user_bio: string | null;
  sender_id: string | null;
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
        
        // Get all conversation IDs where the current user is a participant
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id, is_read, last_read_at')
          .eq('user_id', user.id);
          
        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          throw participantsError;
        }
        
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
          
        if (conversationsError) {
          console.error('Error fetching conversations:', conversationsError);
          throw conversationsError;
        }
        
        if (!conversationsData || conversationsData.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Process each conversation to get the other participant and last message
        const enhancedConversations = await Promise.all(
          conversationsData.map(async (conversation) => {
            try {
              // Get the other participant in this conversation
              const { data: otherParticipants, error: participantError } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conversation.id)
                .neq('user_id', user.id);
                
              if (participantError) {
                console.error('Error fetching other participant:', participantError);
                return null;
              }
              
              // If no other participant found, skip this conversation
              if (!otherParticipants || otherParticipants.length === 0) {
                console.log('No other participant found for conversation:', conversation.id);
                return null;
              }
              
              const otherParticipant = otherParticipants[0];
              
              // Get profile of the other participant
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain, bio')
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
                
              if (messagesError) {
                console.error('Error fetching last message:', messagesError);
              }
                
              const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;
              
              // Calculate unread count
              let unreadCount = 0;
              if (!readStatusMap[conversation.id]?.is_read) {
                const lastReadAt = readStatusMap[conversation.id]?.last_read_at;
                
                const { count, error: countError } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('conversation_id', conversation.id)
                  .neq('sender_id', user.id)
                  .gt('created_at', lastReadAt || '1970-01-01');
                  
                if (countError) {
                  console.error('Error counting unread messages:', countError);
                } else {
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
                other_user_avatar_nft_chain: profileData?.avatar_nft_chain || null,
                other_user_bio: profileData?.bio || null
              };
            } catch (error) {
              console.error('Error processing conversation:', error);
              return null;
            }
          })
        );
        
        // Filter out null values and sort by updated_at
        const validConversations = enhancedConversations
          .filter(Boolean)
          .sort((a, b) => new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime());
        
        console.log('Valid conversations:', validConversations);
        setConversations(validConversations as Conversation[]);
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

    // Set up real-time listener for new messages and conversations
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message change detected:', payload);
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
          console.log('Conversation change detected:', payload);
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
          console.log('Participant change detected:', payload);
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
