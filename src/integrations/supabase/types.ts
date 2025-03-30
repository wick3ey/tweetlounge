export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          tweet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tweet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_reply_id: string | null
          tweet_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_reply_id?: string | null
          tweet_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_reply_id?: string | null
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          tweet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tweet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      market_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          source: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
          source?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          read: boolean
          tweet_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          tweet_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          tweet_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_nft_chain: string | null
          avatar_nft_id: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          ethereum_address: string | null
          followers_count: number
          following_count: number
          id: string
          location: string | null
          replies_sort_order: string | null
          solana_address: string | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_nft_chain?: string | null
          avatar_nft_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          ethereum_address?: string | null
          followers_count?: number
          following_count?: number
          id: string
          location?: string | null
          replies_sort_order?: string | null
          solana_address?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_nft_chain?: string | null
          avatar_nft_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          ethereum_address?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          location?: string | null
          replies_sort_order?: string | null
          solana_address?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      replies: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          parent_reply_id: string | null
          tweet_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_reply_id?: string | null
          tweet_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_reply_id?: string | null
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      retweets: {
        Row: {
          created_at: string
          id: string
          tweet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tweet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retweets_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      tweets: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_retweet: boolean
          likes_count: number
          original_tweet_id: string | null
          replies_count: number
          retweets_count: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_retweet?: boolean
          likes_count?: number
          original_tweet_id?: string | null
          replies_count?: number
          retweets_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_retweet?: boolean
          likes_count?: number
          original_tweet_id?: string | null
          replies_count?: number
          retweets_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tweets_original_tweet_id_fkey"
            columns: ["original_tweet_id"]
            isOneToOne: false
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string
          p_actor_id: string
          p_type: string
          p_tweet_id?: string
          p_comment_id?: string
        }
        Returns: Json
      }
      decrement_counter: {
        Args: {
          row_id: string
        }
        Returns: number
      }
      deduplicate_usernames: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_bookmarked_tweets: {
        Args: {
          p_user_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
          bookmarked_at: string
        }[]
      }
      get_tweet_comments: {
        Args: {
          p_tweet_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          user_id: string
          tweet_id: string
          parent_comment_id: string
          created_at: string
          likes_count: number
          profile_username: string
          profile_display_name: string
          profile_avatar_url: string
          profile_avatar_nft_id: string
          profile_avatar_nft_chain: string
        }[]
      }
      get_tweet_with_author: {
        Args: {
          tweet_id: string
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_tweet_with_author_reliable: {
        Args: {
          tweet_id: string
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_tweets_with_authors: {
        Args: {
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_tweets_with_authors_reliable: {
        Args: {
          limit_count: number
          offset_count: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          profile_username: string
          profile_display_name: string
          profile_avatar_url: string
          profile_avatar_nft_id: string
          profile_avatar_nft_chain: string
        }[]
      }
      get_user_retweets: {
        Args: {
          user_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_user_retweets_reliable: {
        Args: {
          user_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_user_suggestions: {
        Args: {
          current_user_id: string
          limit_count?: number
        }
        Returns: {
          id: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
          created_at: string
        }[]
      }
      get_user_tweets: {
        Args: {
          user_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      get_user_tweets_reliable: {
        Args: {
          user_id: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          content: string
          author_id: string
          created_at: string
          likes_count: number
          retweets_count: number
          replies_count: number
          is_retweet: boolean
          original_tweet_id: string
          image_url: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
        }[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      increment_counter: {
        Args: {
          row_id: string
        }
        Returns: number
      }
      is_tweet_bookmarked: {
        Args: {
          tweet_id: string
          user_id: string
        }
        Returns: boolean
      }
      search_users: {
        Args: {
          search_term: string
          limit_count?: number
        }
        Returns: {
          id: string
          username: string
          display_name: string
          avatar_url: string
          avatar_nft_id: string
          avatar_nft_chain: string
          similarity: number
        }[]
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
