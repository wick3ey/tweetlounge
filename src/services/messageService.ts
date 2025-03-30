
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/supabase';

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

  // First, get the user's conversations
  const { data: participantsData, error: participantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userData.user.id);

  if (participantsError || !participantsData) {
    console.error('Error fetching conversation participants:', participantsError);
    return [];
  }

  // If no conversations, return empty array
  if (participantsData.length === 0) {
    return [];
  }

  // Get all conversation IDs
  const conversationIds = participantsData.map(p => p.conversation_id);

  // Get conversation details
  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });

  if (conversationsError || !conversationsData) {
    console.error('Error fetching conversations:', conversationsError);
    return [];
  }

  // Create a map to store the conversations with their data
  const conversationsMap: { [key: string]: Conversation } = {};
  
  for (const conv of conversationsData) {
    conversationsMap[conv.id] = {
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants: [],
      lastMessage: undefined
    };
  }

  // Get the other participants for each conversation
  const { data: otherParticipantsData, error: otherParticipantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds)
    .neq('user_id', userData.user.id);

  if (!otherParticipantsError && otherParticipantsData) {
    // Get profiles for the other participants
    const otherUserIds = otherParticipantsData.map(p => p.user_id);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherUserIds);

    if (!profilesError && profilesData) {
      // Create a map of user IDs to profiles
      const profilesMap: { [key: string]: Profile } = {};
      for (const profile of profilesData) {
        profilesMap[profile.id] = profile as Profile;
      }

      // Add participants to conversations
      for (const participant of otherParticipantsData) {
        const profile = profilesMap[participant.user_id];
        if (profile && conversationsMap[participant.conversation_id]) {
          if (!conversationsMap[participant.conversation_id].participants) {
            conversationsMap[participant.conversation_id].participants = [];
          }
          conversationsMap[participant.conversation_id].participants?.push(profile);
        }
      }
    }
  }

  // Get last message for each conversation
  for (const conversationId of conversationIds) {
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!messagesError && messagesData && messagesData.length > 0) {
      if (conversationsMap[conversationId]) {
        conversationsMap[conversationId].lastMessage = messagesData[0];
      }
    }
  }

  // Convert the map to an array and sort by updated_at
  return Object.values(conversationsMap).sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
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
