
import { Profile } from "@/lib/supabase";

export interface Tweet {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    image_url?: string | null;
}

export interface TweetWithAuthor {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    image_url?: string | null;
    author?: Profile;
    cacheTimestamp?: number;
    bookmarked_at?: string;
    // Add profile properties that might be present in some API responses
    profile_username?: string;
    profile_display_name?: string;
    profile_avatar_url?: string;
    profile_avatar_nft_id?: string;
    profile_avatar_nft_chain?: string;
}

export function isValidTweet(tweet: any): tweet is Tweet {
    return (
        typeof tweet === 'object' &&
        typeof tweet.id === 'string' &&
        typeof tweet.content === 'string' &&
        typeof tweet.author_id === 'string' &&
        typeof tweet.created_at === 'string' &&
        typeof tweet.likes_count === 'number' &&
        typeof tweet.retweets_count === 'number' &&
        typeof tweet.replies_count === 'number'
    );
}

export const enhanceTweetData = (tweet: TweetWithAuthor): TweetWithAuthor | null => {
    if (!tweet) {
        return null;
    }

    const enhancedTweet: TweetWithAuthor = {
        ...tweet,
        likes_count: tweet.likes_count || 0,
        retweets_count: tweet.retweets_count || 0,
        replies_count: tweet.replies_count || 0
    };

    return enhancedTweet;
};

// Helper function to create a partial Profile from available fields
export const createPartialProfile = (fields: any): Profile => {
    return {
        id: fields.id || '',
        username: fields.username || '',
        display_name: fields.display_name || fields.username || '',
        bio: null,
        avatar_url: fields.avatar_url || null,
        cover_url: null,
        location: null,
        website: null,
        updated_at: null,
        created_at: fields.created_at || new Date().toISOString(),
        replies_sort_order: null,
        ethereum_address: null,
        solana_address: null,
        avatar_nft_id: fields.avatar_nft_id || null,
        avatar_nft_chain: fields.avatar_nft_chain || null,
        followers_count: 0,
        following_count: 0
    };
};
