
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  is_deleted: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
  sender_id?: string;
  other_user_id: string;
  other_user_username: string;
  other_user_display_name: string;
  other_user_avatar?: string;
  other_user_avatar_nft_id?: string;
  other_user_avatar_nft_chain?: string;
  other_user_bio?: string;
  unread_count: number;
}
