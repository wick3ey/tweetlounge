import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/supabase';
import { Message, MessageReaction, Conversation, MessageSearchResult } from '@/types/Message';

export async function createMessage(conversationId: string, content: string): Promise<Message | null> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to send messages');
  }

  await markConversationAsRead(conversationId);

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

  const { data: participantsData, error: participantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userData.user.id);

  if (participantsError || !participantsData) {
    console.error('Error fetching conversation participants:', participantsError);
    return [];
  }

  if (participantsData.length === 0) {
    return [];
  }

  const conversationIds = participantsData.map(p => p.conversation_id);

  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });

  if (conversationsError || !conversationsData) {
    console.error('Error fetching conversations:', conversationsError);
    return [];
  }

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

  const { data: otherParticipantsData, error: otherParticipantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds)
    .neq('user_id', userData.user.id);

  if (!otherParticipantsError && otherParticipantsData) {
    const otherUserIds = otherParticipantsData.map(p => p.user_id);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherUserIds);

    if (!profilesError && profilesData) {
      const profilesMap: { [key: string]: Profile } = {};
      for (const profile of profilesData) {
        profilesMap[profile.id] = profile as Profile;
      }

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

export async function addMessageReaction(messageId: string, reactionType: string): Promise<MessageReaction | null> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to react to messages');
  }

  try {
    await supabase
      .from('message_reactions')
      .delete()
      .match({ 
        message_id: messageId, 
        user_id: userData.user.id,
        reaction_type: reactionType
      });

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userData.user.id,
        reaction_type: reactionType
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error managing reaction:', error);
    return null;
  }
}

export async function removeMessageReaction(messageId: string, reactionType: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to manage message reactions');
  }

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .match({ 
      message_id: messageId, 
      user_id: userData.user.id,
      reaction_type: reactionType
    });

  if (error) {
    console.error('Error removing reaction:', error);
    return false;
  }

  return true;
}

export async function getMessageReactions(messageId: string): Promise<MessageReaction[]> {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching message reactions:', error);
    return [];
  }

  return data;
}

export async function searchMessages(
  conversationId: string, 
  searchTerm: string, 
  limit = 20, 
  offset = 0
): Promise<MessageSearchResult> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to search messages');
  }

  const { data: participantData } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userData.user.id)
    .single();

  if (!participantData) {
    throw new Error('You do not have access to this conversation');
  }

  const { data, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .ilike('content', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error searching messages:', error);
    return { messages: [], total: 0 };
  }

  return {
    messages: data || [],
    total: count || 0
  };
}

export async function markConversationAsRead(conversationId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to mark conversations as read');
  }

  const { error } = await supabase
    .from('conversation_participants')
    .update({ 
      is_read: true,
      last_read_at: new Date().toISOString()
    })
    .match({ 
      conversation_id: conversationId, 
      user_id: userData.user.id 
    });

  if (error) {
    console.error('Error marking conversation as read:', error);
    return false;
  }

  return true;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to delete messages');
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .match({ 
      id: messageId,
      sender_id: userData.user.id 
    });

  if (error) {
    console.error('Error deleting message:', error);
    return false;
  }

  return true;
}

/**
 * Starts or retrieves an existing conversation with another user
 * @param otherUserId The ID of the user to start a conversation with
 * @returns The conversation ID
 */
export async function startConversation(otherUserId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User must be logged in to start conversations');
  }

  try {
    const { data, error } = await supabase
      .rpc('get_or_create_conversation', {
        user1_id: userData.user.id,
        user2_id: otherUserId
      });

    if (error) {
      console.error('Error starting conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in startConversation:', error);
    return null;
  }
}
