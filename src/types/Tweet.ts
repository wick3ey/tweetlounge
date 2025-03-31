import { Profile } from "@/lib/supabase";

export interface Tweet {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    is_retweet: boolean;
    original_tweet_id?: string | null;
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
    is_retweet: boolean;
    original_tweet_id?: string | null;
    image_url?: string | null;
    author?: Profile;
    original_author?: Profile;
    original_tweet?: TweetWithAuthor;
    cacheTimestamp?: number;
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
        typeof tweet.replies_count === 'number' &&
        typeof tweet.is_retweet === 'boolean'
    );
}

export function isValidRetweet(tweet: any): boolean {
    return isValidTweet(tweet) && tweet.is_retweet === true && typeof tweet.original_tweet_id === 'string';
}

export const getSafeTweetId = (tweet: TweetWithAuthor): string => {
    if (!tweet) {
        console.warn('Attempted to get tweet ID from a null tweet.');
        return '';
    }

    if (tweet.is_retweet && tweet.original_tweet_id) {
        return tweet.original_tweet_id;
    }

    return tweet.id;
};

export const enhanceTweetData = (tweet: TweetWithAuthor): TweetWithAuthor | null => {
    if (!tweet) {
        return null;
    }

    const enhancedTweet: TweetWithAuthor = {
        ...tweet,
        likes_count: tweet.likes_count || 0,
        retweets_count: tweet.retweets_count || 0,
        replies_count: tweet.replies_count || 0,
        is_retweet: tweet.is_retweet || false,
    };

    return enhancedTweet;
};
