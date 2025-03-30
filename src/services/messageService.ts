
import { supabase } from '@/integrations/supabase/client';
import { Message, Conversation } from '@/types/Message';

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const { data, error } = await supabase.rpc('get_user_conversations');
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getConversations:', error);
    return [];
  }
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getMessages:', error);
    return [];
  }
};

export const sendMessage = async (conversationId: string, content: string): Promise<Message | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('Error getting current user:', userError);
      return null;
    }
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content,
        conversation_id: conversationId,
        sender_id: userData.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
};

export const markConversationAsRead = async (conversationId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('Error getting current user:', userError);
      return false;
    }
    
    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_read: true,
        last_read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userData.user.id);
    
    if (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markConversationAsRead:', error);
    return false;
  }
};

export const createOrGetConversation = async (otherUserId: string): Promise<string | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('Error getting current user:', userError);
      return null;
    }
    
    const { data, error } = await supabase.rpc(
      'get_or_create_conversation',
      { 
        user1_id: userData.user.id, 
        user2_id: otherUserId 
      }
    );
    
    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createOrGetConversation:', error);
    return null;
  }
};
