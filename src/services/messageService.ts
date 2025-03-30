
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  lastMessage?: Message;
}

export async function createMessage(conversationId: string, content: string): Promise<Message | null> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to send messages');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content: content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

export async function getConversations(): Promise<Conversation[]> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to view conversations');
  }

  // Complex query to get conversations with participants and last message
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      conversations (
        id,
        created_at,
        updated_at,
        messages (
          id,
          content,
          created_at,
          sender_id
        )
      ),
      conversations.conversation_participants!inner (
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('user_id', userData.user.id)
    .order('created_at', { 
      referencedTable: 'conversations', 
      ascending: false 
    });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Transform the data into a more usable format
  return data.map(conv => ({
    id: conv.conversation_id,
    created_at: conv.conversations.created_at,
    updated_at: conv.conversations.updated_at,
    participants: conv.conversations.conversation_participants
      .map(p => p.profiles)
      .filter(profile => profile.id !== userData.user?.id),
    lastMessage: conv.conversations.messages[0]
  }));
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}

export async function startConversation(recipientId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to start a conversation');
  }

  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    user1_id: userData.user.id,
    user2_id: recipientId
  });

  if (error) {
    console.error('Error starting conversation:', error);
    return null;
  }

  return data;
}
