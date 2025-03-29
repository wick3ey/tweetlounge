import { supabase } from "@/integrations/supabase/client";

// Cache constants
const CACHE_KEYS = {
  SOLANA_STATS: 'solana_stats_cache',
  TOP_TOKENS: 'top_tokens_cache',
  HOT_POOLS: 'hot_pools_cache',
  RECENT_TOKENS: 'recent_tokens_cache',
  TOKEN_METADATA_PREFIX: 'token_metadata_',
  TOKEN_IMAGES: 'token_images_cache',
};

const CACHE_DURATIONS = {
  SOLANA_STATS: 30 * 60 * 1000, // 30 minutes
  TOP_TOKENS: 15 * 60 * 1000, // 15 minutes
  HOT_POOLS: 30 * 60 * 1000, // 30 minutes - as requested
  RECENT_TOKENS: 60 * 60 * 1000, // 1 hour
  TOKEN_METADATA: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_IMAGES: 30 * 60 * 1000, // 30 minutes - match hot pools
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
  timestamp?: number;
  source?: string;
}

// Create a client-side memory cache
const MEMORY_CACHE: {[key: string]: {data: any, timestamp: number}} = {};
const FAILED_REQUESTS: {[key: string]: {count: number, lastAttempt: number}} = {};
const RETRY_AFTER = 5 * 60 * 1000; // 5 minutes

// Image preloading state
const IMAGE_PRELOAD_STATUS: {[url: string]: 'loading' | 'loaded' | 'error'} = {};
const BATCH_SIZE = 15; // Process 15 images at a time
const BATCH_INTERVAL = 4000; // 4 seconds between batches

// Add a new in-memory cache specifically for images
const PRELOADED_IMAGES_CACHE = new Map<string, HTMLImageElement>();

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
      try {
        const { data, timestamp } = JSON.parse(cachedItem);
        const isFresh = Date.now() - timestamp < maxAge;
        
        // Even if not fresh, we can still use it while fetching new data
        if (data) {
          console.log(`Using ${isFresh ? 'fresh' : 'stale'} localStorage data for ${key}`);
          
          // Add to memory cache for quicker access
          MEMORY_CACHE[key] = { data, timestamp };
          
          return { data: data as T, isFresh };
        }
      } catch (parseError) {
        console.error(`Error parsing cached data for ${key}:`, parseError);
        localStorage.removeItem(key); // Remove invalid cache entry
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
    if (!data) {
      console.warn(`Attempted to cache null or undefined data for ${key}`);
      return;
    }
    
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

// Helper function for preloading images in batches
export const preloadImages = async (urls: string[], forceCache: boolean = false): Promise<void> => {
  if (!urls || urls.length === 0) return;
  
  const validUrls = urls.filter(url => !!url && typeof url === 'string');
  if (validUrls.length === 0) return;
  
  // Check cache first
  const { data: cachedData, isFresh } = getFromCache<{[url: string]: boolean}>(
    CACHE_KEYS.TOKEN_IMAGES, 
    CACHE_DURATIONS.TOKEN_IMAGES
  );
  
  // Filter out already cached images
  let imagesToLoad = validUrls;
  if (cachedData && (isFresh || forceCache)) {
    imagesToLoad = validUrls.filter(url => !cachedData[url]);
    if (imagesToLoad.length === 0) {
      console.log('All images are already cached, no need to preload');
      return; // All images are already cached
    }
  }
  
  console.log(`Preloading ${imagesToLoad.length} images in batches of ${BATCH_SIZE}`);
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < imagesToLoad.length; i += BATCH_SIZE) {
    batches.push(imagesToLoad.slice(i, i + BATCH_SIZE));
  }
  
  const results: {[url: string]: boolean} = cachedData || {};
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Process each batch in parallel
    await Promise.all(
      batch.map(url => {
        return new Promise<void>((resolve) => {
          if (!url || typeof url !== 'string') {
            resolve();
            return;
          }
          
          // Check if already in memory cache or being loaded
          if (PRELOADED_IMAGES_CACHE.has(url) || 
              IMAGE_PRELOAD_STATUS[url] === 'loading' || 
              IMAGE_PRELOAD_STATUS[url] === 'loaded') {
            resolve();
            return;
          }
          
          IMAGE_PRELOAD_STATUS[url] = 'loading';
          
          const img = new Image();
          
          img.onload = () => {
            IMAGE_PRELOAD_STATUS[url] = 'loaded';
            results[url] = true;
            // Store the loaded image in memory cache
            PRELOADED_IMAGES_CACHE.set(url, img);
            resolve();
          };
          
          img.onerror = () => {
            IMAGE_PRELOAD_STATUS[url] = 'error';
            results[url] = false;
            resolve();
          };
          
          img.src = url;
        });
      })
    );
    
    // Wait before processing the next batch if there are more batches
    if (i < batches.length - 1) {
      console.log(`Batch ${i + 1}/${batches.length} processed, waiting ${BATCH_INTERVAL/1000}s before next batch`);
      await new Promise(resolve => setTimeout(resolve, BATCH_INTERVAL));
    }
  }
  
  // Update cache with results - with persistent flag
  if (forceCache) {
    // Force a cache update even if we're just refreshing existing data
    updateCache(CACHE_KEYS.TOKEN_IMAGES, results);
    console.log(`Image preloading complete, forcibly cached ${Object.keys(results).length} images`);
  } else {
    // Standard update
    updateCache(CACHE_KEYS.TOKEN_IMAGES, results);
    console.log(`Image preloading complete, cached ${Object.keys(results).length} images`);
  }
};

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

// Function to fetch hot pools with improved caching (30 minute cache as requested)
export const fetchHotPools = async (): Promise<HotPoolsData | null> => {
  // First check cache
  const { data: cachedData, isFresh } = getFromCache<HotPoolsData>(
    CACHE_KEYS.HOT_POOLS, 
    CACHE_DURATIONS.HOT_POOLS
  );
  
  // Return cache data immediately if it exists
  if (cachedData && cachedData.hotPools && cachedData.hotPools.length > 0) {
    console.log(`Hot pools: using ${isFresh ? 'fresh' : 'stale'} cached data from ${cachedData.source || 'unknown'} source`);
    
    // If we have hot pools data, preload the images in the background with force cache
    if (cachedData.hotPools && Array.isArray(cachedData.hotPools)) {
      const imageUrls = cachedData.hotPools
        .map(pool => [
          pool.mainToken?.logo, 
          pool.sideToken?.logo
        ])
        .flat()
        .filter(url => !!url) as string[];
      
      // Preload images in the background and force cache them
      setTimeout(() => {
        preloadImages(imageUrls, true).catch(err => console.error('Error preloading images:', err));
      }, 0);
    }
    
    // If data is fresh (less than 30 minutes old), don't fetch new data
    if (isFresh) {
      return cachedData;
    }
    
    // If stale (older than 30 minutes), fetch in background but return cached data immediately
    console.log('Hot pools data is stale, fetching new data in background');
    fetchAndUpdateHotPools().catch(error => 
      console.error('Background refresh of hot pools failed:', error)
    );
    
    return cachedData;
  }
  
  console.log('No cached hot pools data found, fetching new data');
  // No cache, need to fetch fresh data
  return fetchAndUpdateHotPools();
};

// Helper function to fetch and update hot pools cache
async function fetchAndUpdateHotPools(): Promise<HotPoolsData | null> {
  try {
    console.log('Calling getHotPools edge function');
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
        hotPoolsData = { 
          hotPools: data.hotPools,
          timestamp: data.timestamp || Date.now(),
          source: data.source || 'api'
        };
        console.log(`Received ${hotPoolsData.hotPools.length} hot pools from ${hotPoolsData.source}`);
        
        // Preload images for hot pools tokens
        const imageUrls = hotPoolsData.hotPools
          .map(pool => [
            pool.mainToken?.logo, 
            pool.sideToken?.logo
          ])
          .flat()
          .filter(url => !!url) as string[];
        
        // Preload images in background
        setTimeout(() => {
          preloadImages(imageUrls).catch(err => console.error('Error preloading images:', err));
        }, 0);
      }
      
      // Handle the case where hotPools is nested under hotPools.data
      else if (data.hotPools?.data && Array.isArray(data.hotPools.data)) {
        hotPoolsData = { 
          hotPools: data.hotPools.data,
          timestamp: data.timestamp || Date.now(),
          source: data.source || 'api'
        };
        console.log(`Received ${hotPoolsData.hotPools.length} hot pools from nested data`);
        
        // Also preload these images
        const imageUrls = hotPoolsData.hotPools
          .map(pool => [
            pool.mainToken?.logo, 
            pool.sideToken?.logo
          ])
          .flat()
          .filter(url => !!url) as string[];
        
        setTimeout(() => {
          preloadImages(imageUrls).catch(err => console.error('Error preloading images:', err));
        }, 0);
      }
    }
    
    if (hotPoolsData && hotPoolsData.hotPools.length > 0) {
      // Update cache with new data
      console.log(`Updating hot pools cache with ${hotPoolsData.hotPools.length} pools`);
      updateCache(CACHE_KEYS.HOT_POOLS, hotPoolsData);
      return hotPoolsData;
    }
    
    console.error('Unexpected data format for hot pools or empty array:', data);
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
    if (!address) {
      console.error("Cannot fetch token metadata for empty address");
      return null;
    }
    
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
        fetchNewTokenMetadata(address).catch(err => 
          console.error(`Background refresh failed for token ${address}:`, err)
        );
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
    
    // Create a fallback token if nothing else available
    return {
      address,
      name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
      symbol: "???",
      logo: `https://placehold.co/200x200/8B4513/ffffff?text=${address.substring(0, 2)}`,
    };
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
      
      // Create a fallback token for errors
      const fallbackToken: TokenInfo = {
        address,
        name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
        symbol: "???",
        logo: `https://placehold.co/200x200/8B4513/ffffff?text=${address.substring(0, 2)}`,
      };
      
      // Cache fallback for a short time
      updateCache(`${CACHE_KEYS.TOKEN_METADATA_PREFIX}${address}`, fallbackToken);
      
      return fallbackToken;
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
    
    // Create a fallback token for errors
    return {
      address,
      name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
      symbol: "???",
      logo: `https://placehold.co/200x200/8B4513/ffffff?text=${address.substring(0, 2)}`,
    };
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
    // Preload token logos in the background with forced cache
    const imageUrls = cachedData
      .map(token => token.logo)
      .filter(url => !!url) as string[];
    
    setTimeout(() => {
      preloadImages(imageUrls, true).catch(err => console.error('Error preloading recent token images:', err));
    }, 0);
    
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
      // Preload token logos
      const imageUrls = data
        .map((token: TokenInfo) => token.logo)
        .filter((url: string | undefined) => !!url) as string[];
      
      setTimeout(() => {
        preloadImages(imageUrls, true).catch(err => console.error('Error preloading recent token images:', err));
      }, 0);
      
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
