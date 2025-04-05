
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  avatar_nft_id?: string;
  avatar_nft_chain?: string;
  bio?: string | null;
  cover_url?: string | null;
  location?: string | null;
  website?: string | null;
  updated_at?: string | null;
  created_at?: string;
  ethereum_address?: string | null;
  solana_address?: string | null;
  followers_count?: number;
  following_count?: number;
  replies_sort_order?: string | null;
}
