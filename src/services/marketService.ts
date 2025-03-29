import { supabase } from "@/integrations/supabase/client";

// Cache constants
const CACHE_KEYS = {
  SOLANA_STATS: 'solana_stats_cache',
  TOP_TOKENS: 'top_tokens_cache',
  HOT_POOLS: 'hot_pools_cache',
  RECENT_TOKENS: 'recent_tokens_cache',
  TOKEN_METADATA_PREFIX: 'token_metadata_',
};

const CACHE_DURATIONS = {
  SOLANA_STATS: 30 * 60 * 1000, // 30 minutes
  TOP_TOKENS: 15 * 60 * 1000, // 15 minutes
  HOT_POOLS: 15 * 60 * 1000, // 15 minutes
  RECENT_TOKENS: 60 * 60 * 1000, // 1 hour
  TOKEN_METADATA: 24 * 60 * 60 * 1000, // 24 hours
};

// Basic types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  decimals?: number;
  creationTime?: string;
  creationBlock?: number;
  socialInfo?: {
    [key: string]: string;
  };
}

export interface PoolInfo {
  address: string;
  exchangeName: string;
  exchangeFactory: string;
  creationTime: string;
  mainToken: TokenInfo;
  sideToken: TokenInfo;
  fee: number;
  price?: number;
  price24h?: number;
  variation24h?: number;
  volume24h?: number;
  liquidity?: number;
  rank?: number;
}

export interface SolanaMarketStats {
  name: string;
  id: string;
  website: string;
  exchangeCount: number;
  tvl: number;
  tokenCount: number;
  poolCount: number;
}

export interface TopTokensData {
  gainers: PoolInfo[];
  losers: PoolInfo[];
}

export interface HotPoolsData {
  hotPools: PoolInfo[];
}

// Create a client-side memory cache
const MEMORY_CACHE: {[key: string]: {data: any, timestamp: number}} = {};
const FAILED_REQUESTS: {[key: string]: {count: number, lastAttempt: number}} = {};
const RETRY_AFTER = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data from localStorage
function getFromCache<T>(key: string, maxAge: number): { data: T | null, isFresh: boolean } {
  try {
    // Try memory cache first (for the current session)
    const memoryCache = MEMORY_CACHE[key];
    if (memoryCache && Date.now() - memoryCache.timestamp < maxAge) {
      console.log(`Using memory cached data for ${key}`);
      return { data: memoryCache.data as T, isFresh: true };
    }

    // Try localStorage cache next (persists across page refreshes)
    const cachedItem = localStorage.getItem(key);
    if (cachedItem) {
      const { data, timestamp } = JSON.parse(cachedItem);
      const isFresh = Date.now() - timestamp < maxAge;
      
      // Even if not fresh, we can still use it while fetching new data
      if (data) {
        console.log(`Using ${isFresh ? 'fresh' : 'stale'} localStorage data for ${key}`);
        
        // Add to memory cache for quicker access
        MEMORY_CACHE[key] = { data, timestamp };
        
        return { data: data as T, isFresh };
      }
    }
    
    return { data: null, isFresh: false };
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return { data: null, isFresh: false };
  }
}

// Helper function to store data in cache
function updateCache(key: string, data: any): void {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    
    // Update memory cache
    MEMORY_CACHE[key] = cacheItem;
    
    // Update localStorage cache
    localStorage.setItem(key, JSON.stringify(cacheItem));
    
    console.log(`Updated cache for ${key}`);
  } catch (error) {
    console.error(`Error updating cache for ${key}:`, error);
    // If localStorage fails (e.g., quota exceeded), at least keep in memory
    MEMORY_CACHE[key] = { data, timestamp: Date.now() };
  }
}

// Primary function to fetch Solana chain information
export const fetchSolanaStats = async (): Promise<SolanaMarketStats | null> => {
  // First check cache
  const { data: cachedData, isFresh } = getFromCache<SolanaMarketStats>(
    CACHE_KEYS.SOLANA_STATS, 
    CACHE_DURATIONS.SOLANA_STATS
  );
  
  // Return cache data immediately if it exists
  if (cachedData) {
    // If data is fresh, don't fetch new data
    if (isFresh) return cachedData;
    
    // If stale, fetch in background but return cached data immediately
    fetchAndUpdateSolanaStats().catch(error => 
      console.error('Background refresh of Solana stats failed:', error)
    );
    
    return cachedData;
  }
  
  // No cache, need to fetch fresh data
  return fetchAndUpdateSolanaStats();
};

// Helper function to fetch and update cache
async function fetchAndUpdateSolanaStats(): Promise<SolanaMarketStats | null> {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getSolanaStats', {});
    
    if (error) {
      console.error('Error fetching Solana stats:', error);
      return null;
    }
    
    const statsData = data as SolanaMarketStats;
    
    // Update cache with new data
    updateCache(CACHE_KEYS.SOLANA_STATS, statsData);
    
    return statsData;
  } catch (error) {
    console.error('Error in fetchSolanaStats:', error);
    return null;
  }
}

// Function to fetch top gainers and losers
export const fetchTopTokens = async (): Promise<TopTokensData | null> => {
  // First check cache
  const { data: cachedData, isFresh } = getFromCache<TopTokensData>(
    CACHE_KEYS.TOP_TOKENS, 
    CACHE_DURATIONS.TOP_TOKENS
  );
  
  // Return cache data immediately if it exists
  if (cachedData) {
    // If data is fresh, don't fetch new data
    if (isFresh) return cachedData;
    
    // If stale, fetch in background but return cached data immediately
    fetchAndUpdateTopTokens().catch(error => 
      console.error('Background refresh of top tokens failed:', error)
    );
    
    return cachedData;
  }
  
  // No cache, need to fetch fresh data
  return fetchAndUpdateTopTokens();
};

// Helper function to fetch and update cache
async function fetchAndUpdateTopTokens(): Promise<TopTokensData | null> {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTopTokens', {
      body: { chain: 'solana' }
    });
    
    if (error) {
      console.error('Error fetching top tokens:', error);
      return null;
    }
    
    // Fix for data structure - ensure we correctly process the nested response
    let topTokensData: TopTokensData | null = null;
    
    if (data && typeof data === 'object') {
      // Check if data has the expected structure with gainers and losers properties
      if (data.gainers && data.losers) {
        topTokensData = data as TopTokensData;
      }
      
      // Handle the case where gainers/losers are nested under statusCode/data
      else if (data.gainers?.data && data.losers?.data) {
        topTokensData = {
          gainers: Array.isArray(data.gainers.data) ? data.gainers.data : [],
          losers: Array.isArray(data.losers.data) ? data.losers.data : []
        };
      }
    }
    
    if (topTokensData) {
      // Update cache with new data
      updateCache(CACHE_KEYS.TOP_TOKENS, topTokensData);
      return topTokensData;
    }
    
    console.error('Unexpected data format for top tokens:', data);
    return null;
  } catch (error) {
    console.error('Error in fetchTopTokens:', error);
    return null;
  }
}

// Function to fetch hot pools
export const fetchHotPools = async (): Promise<HotPoolsData | null> => {
  // First check cache
  const { data: cachedData, isFresh } = getFromCache<HotPoolsData>(
    CACHE_KEYS.HOT_POOLS, 
    CACHE_DURATIONS.HOT_POOLS
  );
  
  // Return cache data immediately if it exists
  if (cachedData) {
    // If data is fresh, don't fetch new data
    if (isFresh) return cachedData;
    
    // If stale, fetch in background but return cached data immediately
    fetchAndUpdateHotPools().catch(error => 
      console.error('Background refresh of hot pools failed:', error)
    );
    
    return cachedData;
  }
  
  // No cache, need to fetch fresh data
  return fetchAndUpdateHotPools();
};

// Helper function to fetch and update cache
async function fetchAndUpdateHotPools(): Promise<HotPoolsData | null> {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getHotPools', {
      body: { chain: 'solana' }
    });
    
    if (error) {
      console.error('Error fetching hot pools:', error);
      return null;
    }
    
    // Fix for data structure - ensure we correctly process the nested response
    let hotPoolsData: HotPoolsData | null = null;
    
    if (data && typeof data === 'object') {
      // Check if data has the hotPools property directly
      if (Array.isArray(data.hotPools)) {
        hotPoolsData = { hotPools: data.hotPools };
      }
      
      // Handle the case where hotPools is nested under hotPools.data
      else if (data.hotPools?.data && Array.isArray(data.hotPools.data)) {
        hotPoolsData = { hotPools: data.hotPools.data };
      }
    }
    
    if (hotPoolsData) {
      // Update cache with new data
      updateCache(CACHE_KEYS.HOT_POOLS, hotPoolsData);
      return hotPoolsData;
    }
    
    console.error('Unexpected data format for hot pools:', data);
    return null;
  } catch (error) {
    console.error('Error in fetchHotPools:', error);
    return null;
  }
}

// Function to fetch token details by address
export const fetchTokenDetails = async (address: string): Promise<TokenInfo | null> => {
  // Check if we have a cached token first
  const cacheKey = `${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`;
  const { data: cachedData, isFresh } = getFromCache<TokenInfo>(
    cacheKey, 
    CACHE_DURATIONS.TOKEN_METADATA
  );
  
  // Return cache data immediately if it exists
  if (cachedData) {
    // If data is fresh, don't fetch new data
    if (isFresh) return cachedData;
    
    // If stale, fetch in background but return cached data immediately
    fetchAndUpdateTokenDetails(address).catch(error => 
      console.error(`Background refresh of token ${address} failed:`, error)
    );
    
    return cachedData;
  }
  
  return fetchAndUpdateTokenDetails(address);
};

// Helper function to fetch and update token details
async function fetchAndUpdateTokenDetails(address: string): Promise<TokenInfo | null> {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTokenDetails', {
      body: { chain: 'solana', address }
    });
    
    if (error) {
      console.error(`Error fetching token details for ${address}:`, error);
      return null;
    }
    
    const tokenInfo = data as TokenInfo;
    
    // Update cache with new data
    updateCache(`${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`, tokenInfo);
    
    return tokenInfo;
  } catch (error) {
    console.error(`Error in fetchTokenDetails for ${address}:`, error);
    return null;
  }
}

// Function to fetch token metadata with improved caching and error handling
export const fetchTokenMetadata = async (address: string): Promise<TokenInfo | null> => {
  try {
    // Check if we recently failed to fetch this token and should wait before retrying
    const failedRequest = FAILED_REQUESTS[address];
    if (failedRequest) {
      const now = Date.now();
      if (now - failedRequest.lastAttempt < RETRY_AFTER && failedRequest.count > 2) {
        console.log(`Skipping request for ${address} due to previous failures, will retry later`);
        return null;
      }
    }
    
    // Check if we have a valid cached response in localStorage
    const cacheKey = `${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`;
    const { data: cachedData, isFresh } = getFromCache<TokenInfo>(
      cacheKey, 
      CACHE_DURATIONS.TOKEN_METADATA
    );
    
    // Return cache data immediately if it exists
    if (cachedData) {
      // If data is fresh, don't fetch new data
      if (isFresh) return cachedData;
      
      // If we have cached data but it's stale, still return it but fetch new data in background
      setTimeout(() => {
        fetchNewTokenMetadata(address).catch(console.error);
      }, 0);
      
      return cachedData;
    }
    
    // No cache hit, fetch new data
    return await fetchNewTokenMetadata(address);
  } catch (error) {
    console.error(`Error in fetchTokenMetadata for ${address}:`, error);
    
    // Track failed requests
    if (!FAILED_REQUESTS[address]) {
      FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
    }
    FAILED_REQUESTS[address].count++;
    FAILED_REQUESTS[address].lastAttempt = Date.now();
    
    // Check if we have any cached data to return as fallback
    const cacheKey = `${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`;
    const { data: cachedData } = getFromCache<TokenInfo>(cacheKey, Infinity); // No time limit for fallback
    
    if (cachedData) {
      return cachedData;
    }
    
    return null;
  }
};

// Helper to fetch new token metadata
async function fetchNewTokenMetadata(address: string): Promise<TokenInfo | null> {
  try {
    console.log(`Fetching metadata for ${address}`);
    
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTokenMetadata', {
      body: { chain: 'solana', address }
    });
    
    if (error) {
      console.error(`Error fetching token metadata for ${address}:`, error);
      
      // Track failed requests
      if (!FAILED_REQUESTS[address]) {
        FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
      }
      FAILED_REQUESTS[address].count++;
      FAILED_REQUESTS[address].lastAttempt = Date.now();
      
      return null;
    }
    
    // Reset failure count on successful request
    if (FAILED_REQUESTS[address]) {
      delete FAILED_REQUESTS[address];
    }
    
    // Process and cache the data
    let tokenData: TokenInfo | null = null;
    
    // Check if the data has a nested structure
    if (data && data.data) {
      tokenData = data.data as TokenInfo;
    } else {
      tokenData = data as TokenInfo;
    }
    
    if (tokenData) {
      // Update cache
      updateCache(`${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`, tokenData);
    }
    
    return tokenData;
  } catch (error) {
    console.error(`Error in fetchNewTokenMetadata for ${address}:`, error);
    
    // Track failed requests
    if (!FAILED_REQUESTS[address]) {
      FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
    }
    FAILED_REQUESTS[address].count++;
    FAILED_REQUESTS[address].lastAttempt = Date.now();
    
    return null;
  }
}

// Function to fetch recent tokens
export const fetchRecentTokens = async (limit: number = 10): Promise<TokenInfo[]> => {
  // First check cache
  const { data: cachedData, isFresh } = getFromCache<TokenInfo[]>(
    CACHE_KEYS.RECENT_TOKENS, 
    CACHE_DURATIONS.RECENT_TOKENS
  );
  
  // Return cache data immediately if it exists
  if (cachedData && cachedData.length > 0) {
    // If data is fresh, don't fetch new data
    if (isFresh) return cachedData;
    
    // If stale, fetch in background but return cached data immediately
    fetchAndUpdateRecentTokens(limit).catch(error => 
      console.error('Background refresh of recent tokens failed:', error)
    );
    
    return cachedData;
  }
  
  // No cache, need to fetch fresh data
  return fetchAndUpdateRecentTokens(limit);
};

// Helper function to fetch and update recent tokens
async function fetchAndUpdateRecentTokens(limit: number): Promise<TokenInfo[]> {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getRecentTokens', {
      body: { chain: 'solana', limit }
    });
    
    if (error) {
      console.error('Error fetching recent tokens:', error);
      return [];
    }
    
    if (Array.isArray(data) && data.length > 0) {
      // Update cache with new data
      updateCache(CACHE_KEYS.RECENT_TOKENS, data);
      return data as TokenInfo[];
    }
    
    console.warn('Invalid or missing data from recent tokens endpoint');
    return [];
  } catch (error) {
    console.error('Error in fetchRecentTokens:', error);
    return [];
  }
}
