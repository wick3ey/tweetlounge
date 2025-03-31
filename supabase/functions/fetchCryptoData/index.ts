
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0'

// Define the base URL for our API
const API_URL = 'https://f3oci3ty.xyz/api/crypto'

// Define the CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseKey)

// Define cache duration - 30 minutes
const CACHE_DURATION = 30 * 60 * 1000

// Default fallback data to return when API is unreachable
const FALLBACK_DATA = {
  gainers: [
    {
      symbol: "BTC",
      name: "Bitcoin",
      address: "bitcoin-address",
      price: 85000,
      mcap: 1800000000000,
      variation24h: 5.2,
      rank: 1,
      exchange: "Binance",
      pool: "btc-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 19500000,
        totalSupply: 21000000,
        mcap: 1800000000000,
        fdv: 1900000000000,
        holders: 200000000
      }
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "ethereum-address",
      price: 3200,
      mcap: 380000000000,
      variation24h: 4.8,
      rank: 2,
      exchange: "Binance",
      pool: "eth-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 120000000,
        totalSupply: 120000000,
        mcap: 380000000000,
        fdv: 380000000000,
        holders: 90000000
      }
    },
    {
      symbol: "SOL",
      name: "Solana",
      address: "solana-address",
      price: 160,
      mcap: 75000000000,
      variation24h: 8.5,
      rank: 3,
      exchange: "Binance",
      pool: "sol-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 450000000,
        totalSupply: 500000000,
        mcap: 75000000000,
        fdv: 80000000000,
        holders: 25000000
      }
    }
  ],
  losers: [
    {
      symbol: "DOGE",
      name: "Dogecoin",
      address: "dogecoin-address",
      price: 0.13,
      mcap: 18000000000,
      variation24h: -3.8,
      rank: 1,
      exchange: "Binance",
      pool: "doge-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 140000000000,
        totalSupply: 140000000000,
        mcap: 18000000000,
        fdv: 18000000000,
        holders: 5000000
      }
    },
    {
      symbol: "SHIB",
      name: "Shiba Inu",
      address: "shiba-address",
      price: 0.000018,
      mcap: 10000000000,
      variation24h: -2.5,
      rank: 2,
      exchange: "Binance",
      pool: "shib-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 549000000000000,
        totalSupply: 1000000000000000,
        mcap: 10000000000,
        fdv: 18000000000,
        holders: 1200000
      }
    },
    {
      symbol: "XRP",
      name: "Ripple",
      address: "ripple-address",
      price: 0.54,
      mcap: 30000000000,
      variation24h: -1.2,
      rank: 3,
      exchange: "Binance",
      pool: "xrp-usdt",
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 55000000000,
        totalSupply: 100000000000,
        mcap: 30000000000,
        fdv: 54000000000,
        holders: 4000000
      }
    }
  ],
  hotPools: [
    {
      symbol: "NEW",
      name: "NewToken",
      tokenAddress: "new-token-address",
      poolAddress: "new-token-pool",
      mcap: 2000000,
      rank: 1,
      exchange: "Raydium",
      creationTime: new Date().toISOString(),
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 10000000,
        totalSupply: 100000000,
        mcap: 2000000,
        fdv: 20000000,
        holders: 1500
      }
    },
    {
      symbol: "LAUNCH",
      name: "LaunchToken",
      tokenAddress: "launch-token-address",
      poolAddress: "launch-token-pool",
      mcap: 1500000,
      rank: 2,
      exchange: "Raydium",
      creationTime: new Date().toISOString(),
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 5000000,
        totalSupply: 50000000,
        mcap: 1500000,
        fdv: 15000000,
        holders: 900
      }
    },
    {
      symbol: "FRESH",
      name: "FreshToken",
      tokenAddress: "fresh-token-address",
      poolAddress: "fresh-token-pool",
      mcap: 800000,
      rank: 3,
      exchange: "Orca",
      creationTime: new Date().toISOString(),
      logoUrl: null,
      financialInfo: {
        circulatingSupply: 2000000,
        totalSupply: 20000000,
        mcap: 800000,
        fdv: 8000000,
        holders: 450
      }
    }
  ],
  lastUpdated: new Date().toISOString()
};

// Create 'token-logos' bucket if it doesn't exist
async function ensureStorageBucketExists() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error checking buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'token-logos');
    
    if (!bucketExists) {
      console.log('Creating token-logos bucket');
      const { error } = await supabase.storage.createBucket('token-logos', {
        public: true
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
      
      // Set bucket policy to be public
      const { error: policyError } = await supabase.storage.from('token-logos').createSignedUrl(
        'dummy.txt', 
        60, 
        { download: true }
      );
      
      if (policyError && !policyError.message.includes('not found')) {
        console.error('Error setting bucket policy:', policyError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error ensuring bucket exists:', error);
    return false;
  }
}

// Cache images to Supabase Storage
async function cacheImageToStorage(imageUrl: string, symbol: string) {
  try {
    if (!imageUrl) return null;
    
    // Create a sanitized file name from the symbol
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    // Check if the image already exists in storage
    const { data: existingFiles } = await supabase.storage
      .from('token-logos')
      .list('', {
        search: fileName
      });
      
    if (existingFiles && existingFiles.length > 0) {
      const { data: publicUrl } = supabase.storage
        .from('token-logos')
        .getPublicUrl(fileName);
        
      return publicUrl.publicUrl;
    }
    
    // Fetch the image from the source
    console.log(`Fetching image from ${imageUrl} for ${symbol}`);
    const imageResponse = await fetch(imageUrl, {
      headers: { 'Accept': 'image/*' },
      cache: 'no-store'
    });
    
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image for ${symbol}: ${imageResponse.statusText}`);
      return null;
    }
    
    // Get image as blob
    const imageBlob = await imageResponse.blob();
    
    // Convert blob to array buffer for Supabase storage
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    // Upload the image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('token-logos')
      .upload(fileName, arrayBuffer, {
        contentType: imageBlob.type,
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error(`Error uploading image for ${symbol}:`, uploadError);
      return null;
    }
    
    // Get the public URL for the cached image
    const { data: publicUrl } = supabase.storage
      .from('token-logos')
      .getPublicUrl(fileName);
      
    console.log(`Successfully cached image for ${symbol}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error(`Error caching image for ${symbol}:`, error);
    return null;
  }
}

// Process and cache images for tokens
async function processTokenImages(tokens: any[]) {
  if (!tokens || !Array.isArray(tokens)) return tokens;
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 5;
  const processedTokens = [...tokens]; // Create a copy to modify
  
  for (let i = 0; i < processedTokens.length; i += batchSize) {
    const batch = processedTokens.slice(i, i + batchSize);
    
    // Process each token in the batch concurrently
    await Promise.all(batch.map(async (token, index) => {
      if (token.logoUrl) {
        const cachedImageUrl = await cacheImageToStorage(token.logoUrl, token.symbol || `token${i + index}`);
        if (cachedImageUrl) {
          processedTokens[i + index] = {
            ...token,
            logoUrl: cachedImageUrl, // Replace with cached image URL
            originalLogoUrl: token.logoUrl // Keep the original URL as reference
          };
        }
      }
    }));
  }
  
  return processedTokens;
}

// Check if we have cached data before a specific timeout
async function getValidCachedData(cache_key: string) {
  try {
    const { data: cachedData, error: cacheError } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', cache_key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cacheError) {
      console.error('Error checking cache:', cacheError);
      return null;
    }

    if (cachedData) {
      console.log('Returning cached market data');
      return cachedData.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving cached data:', error);
    return null;
  }
}

// Store data in cache with an expiration
async function storeCacheData(cache_key: string, data: any, expiresIn: number) {
  try {
    const expires = new Date(Date.now() + expiresIn);
    
    // Delete any existing entries with this key first
    const { error: deleteError } = await supabase
      .from('market_cache')
      .delete()
      .eq('cache_key', cache_key);
      
    if (deleteError) {
      console.error('Error deleting existing cache:', deleteError);
    }
    
    // Insert the new cache entry
    const { error: insertError } = await supabase
      .from('market_cache')
      .insert({
        cache_key: cache_key,
        data: data,
        expires_at: expires.toISOString(),
        source: 'f3oci3ty.xyz'
      });

    if (insertError) {
      console.error('Error inserting cache:', insertError);
      return false;
    }
    
    console.log(`Successfully cached market data with key: ${cache_key}`);
    return true;
  } catch (error) {
    console.error('Error storing cache data:', error);
    return false;
  }
}

// Fetch from external API with timeout
async function fetchWithTimeout(url: string, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting crypto data fetch...');

    // Get the cache key from the request body or use default
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No valid JSON in request body, using default parameters');
    }

    const { cache_key = 'market_data_v1' } = requestBody;
    console.log(`Using cache key: ${cache_key}`);

    // Try to get valid cached data
    const cachedData = await getValidCachedData(cache_key);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

    console.log('No valid cache found, fetching fresh data from API');

    // Ensure the storage bucket exists
    await ensureStorageBucketExists();

    // Attempt to fetch fresh data with timeout
    let marketData;
    let processedData;
    
    try {
      const response = await fetchWithTimeout(
        API_URL, 
        { headers: { 'Accept': 'application/json' }, cache: 'no-store' },
        7000 // 7 second timeout
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      marketData = await response.json();
      
      // Process and cache all images
      console.log('Processing and caching token images...');
      processedData = {
        ...marketData,
        gainers: await processTokenImages(marketData.gainers),
        losers: await processTokenImages(marketData.losers),
        hotPools: await processTokenImages(marketData.hotPools)
      };
      
      // Store in cache
      await storeCacheData(cache_key, processedData, CACHE_DURATION);
      
      console.log('Successfully fetched and processed market data');
    } catch (fetchError) {
      console.error('Error fetching from API:', fetchError.message);
      
      // Check if we have ANY expired cached data as a first fallback
      const { data: expiredCache } = await supabase
        .from('market_cache')
        .select('data')
        .eq('cache_key', cache_key)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (expiredCache && expiredCache.data) {
        console.log('Using expired cached data as fallback');
        processedData = expiredCache.data;
      } else {
        // Use hardcoded fallback data as last resort
        console.log('Using hardcoded fallback data');
        processedData = FALLBACK_DATA;
      }
      
      // Store the fallback data with a shorter expiration time
      await storeCacheData(cache_key, processedData, 5 * 60 * 1000); // 5 minutes
    }

    return new Response(JSON.stringify(processedData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('Unhandled error in fetchCryptoData:', error.message, error.stack);
    
    // Return fallback data in case of any error
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch market data', 
      details: error.message,
      fallbackData: FALLBACK_DATA
    }), {
      status: 200, // Return 200 instead of 500 to prevent client errors
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
