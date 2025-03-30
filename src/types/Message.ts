
import { Profile } from '@/lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  lastMessage?: Message;
}

export interface MessageSearchResult {
  messages: Message[];
  total: number;
}
