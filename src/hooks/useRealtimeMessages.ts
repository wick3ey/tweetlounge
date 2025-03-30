
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/Message';
import { getMessages } from '@/services/messageService';

interface EnhancedMessage extends Message {
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
}

export const useRealtimeMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial fetch of messages
    const fetchMessages = async () => {
      try {
        // Get the raw messages
        const messagesData = await getMessages(conversationId);
        
        // If we have messages, enhance them with sender information
        if (messagesData.length > 0) {
          // Get unique sender IDs
          const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
          
          // Fetch profiles for these senders
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', senderIds);
            
          if (profilesError) {
            console.error('Error fetching sender profiles:', profilesError);
            throw profilesError;
          }
          
          // Create a map of sender profiles
          const senderProfiles = profiles?.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>) || {};
          
          // Enhance messages with sender information
          const enhancedMessages = messagesData.map(message => ({
            ...message,
            sender_name: senderProfiles[message.sender_id]?.display_name || senderProfiles[message.sender_id]?.username,
            sender_username: senderProfiles[message.sender_id]?.username,
            sender_avatar: senderProfiles[message.sender_id]?.avatar_url
          }));
          
          setMessages(enhancedMessages);
        } else {
          setMessages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time listener for new messages
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch sender info for the new message
          const { data: senderProfile, error: senderError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();
            
          if (senderError) {
            console.error('Error fetching sender profile:', senderError);
          }
          
          // Enhance the new message with sender info
          const enhancedMessage: EnhancedMessage = {
            ...newMessage,
            sender_name: senderProfile?.display_name || senderProfile?.username,
            sender_username: senderProfile?.username,
            sender_avatar: senderProfile?.avatar_url
          };
          
          setMessages(currentMessages => [...currentMessages, enhancedMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const updatedMessage = payload.new as Message;
          
          setMessages(currentMessages => 
            currentMessages.map(msg => {
              if (msg.id === updatedMessage.id) {
                // Preserve sender info from the existing message
                return {
                  ...updatedMessage,
                  sender_name: msg.sender_name,
                  sender_username: msg.sender_username,
                  sender_avatar: msg.sender_avatar
                };
              }
              return msg;
            })
          );
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error };
};
