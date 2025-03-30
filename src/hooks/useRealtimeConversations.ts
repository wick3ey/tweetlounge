
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
        
        // Try to use the RPC function
        const { data, error } = await supabase
          .rpc('get_user_conversations', { 
            user_uuid: user.id 
          });
          
        if (error) {
          console.error('Error fetching conversations:', error);
          console.error('Error details:', error.message, error.details, error.hint);
          
          // Fallback query to fetch conversations manually
          const { data: participantsData, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            throw participantsError;
          }

          if (!participantsData || participantsData.length === 0) {
            console.log('No conversations found');
            setConversations([]);
            return;
          }

          const conversationIds = participantsData.map(p => p.conversation_id);

          // Fetch conversation details
          const { data: conversationsData, error: conversationsError } = await supabase
            .from('conversations')
            .select(`
              id, 
              created_at, 
              updated_at,
              conversation_participants (user_id),
              messages (
                content, 
                created_at, 
                sender_id
              )
            `)
            .in('id', conversationIds)
            .order('updated_at', { ascending: false });

          if (conversationsError) {
            console.error('Error fetching conversations:', conversationsError);
            throw conversationsError;
          }

          console.log('Fetched conversations data:', conversationsData);
          
          // Process conversations data
          const processedConversations: Conversation[] = [];
          
          for (const conv of conversationsData) {
            // Find the other participant
            const otherParticipant = conv.conversation_participants.find(
              (p: { user_id: string }) => p.user_id !== user.id
            );

            if (!otherParticipant) continue;

            // Fetch other user's profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipant.user_id)
              .single();

            if (!profile) continue;

            // Get the latest message
            const latestMessage = conv.messages.length > 0 
              ? conv.messages[conv.messages.length - 1]
              : null;

            processedConversations.push({
              id: conv.id,
              created_at: conv.created_at,
              updated_at: conv.updated_at,
              last_message: latestMessage?.content || null,
              last_message_time: latestMessage?.created_at || null,
              unread_count: 0, // TODO: Implement unread count logic
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
          
          setConversations(processedConversations);
        } else {
          console.log('Successfully fetched conversations:', data);
          setConversations(data || []);
        }
      } catch (error) {
        console.error('Error in fetchConversations:', error);
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

    // Set up real-time listener for conversation updates
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
          fetchConversations(); // Refresh conversations when the user sends a message
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
          fetchConversations(); // Refresh conversations when a new message is received
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
