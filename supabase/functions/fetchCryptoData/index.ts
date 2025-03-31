
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

// Cache images to Supabase Storage with improved error handling and retries
async function cacheImageToStorage(imageUrl: string, symbol: string, retries = 2) {
  try {
    if (!imageUrl) return null;
    
    // Create a sanitized file name from the symbol
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    console.log(`Processing image for ${symbol}, fileName: ${fileName}`);
    
    // Check if the image already exists in storage
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('token-logos')
      .list('', {
        search: fileName
      });
    
    if (listError) {
      console.error(`Error checking if image exists for ${symbol}:`, listError);
    }
      
    if (existingFiles && existingFiles.length > 0) {
      console.log(`Image for ${symbol} already exists, returning public URL`);
      const { data: publicUrl } = supabase.storage
        .from('token-logos')
        .getPublicUrl(fileName);
        
      return publicUrl.publicUrl;
    }
    
    // Fetch the image from the source
    console.log(`Fetching image from ${imageUrl} for ${symbol}`);
    
    // Add timeout and proper error handling for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: { 
          'Accept': 'image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      // Check content type to ensure it's an image
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.warn(`Response for ${symbol} is not an image (${contentType}), skipping`);
        return null;
      }
      
      // Get image as blob
      const imageBlob = await imageResponse.blob();
      
      // Ensure we received actual data
      if (imageBlob.size === 0) {
        console.warn(`Received empty image for ${symbol}, skipping`);
        return null;
      }
      
      console.log(`Successfully fetched image for ${symbol} (${imageBlob.size} bytes, ${contentType})`);
      
      // Convert blob to array buffer for Supabase storage
      const arrayBuffer = await imageBlob.arrayBuffer();
      
      // Upload the image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('token-logos')
        .upload(fileName, arrayBuffer, {
          contentType: imageBlob.type || 'image/png',
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error(`Error uploading image for ${symbol}:`, uploadError);
        return null;
      }
      
      console.log(`Successfully uploaded image for ${symbol}`);
      
      // Get the public URL for the cached image
      const { data: publicUrl } = supabase.storage
        .from('token-logos')
        .getPublicUrl(fileName);
        
      console.log(`Successfully cached image for ${symbol}: ${publicUrl.publicUrl}`);
      return publicUrl.publicUrl;
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.error(`Error fetching image for ${symbol}:`, fetchError.message);
      
      // Retry logic for retriable errors
      if (retries > 0 && (
        fetchError.message.includes('fetch failed') || 
        fetchError.message.includes('network') ||
        fetchError.message.includes('timeout')
      )) {
        console.log(`Retrying image fetch for ${symbol} (${retries} retries left)`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return cacheImageToStorage(imageUrl, symbol, retries - 1);
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error in cacheImageToStorage for ${symbol}:`, error);
    return null;
  }
}

// Process and cache images for tokens with improved reliability
async function processTokenImages(tokens: any[]) {
  if (!tokens || !Array.isArray(tokens)) return tokens;
  
  console.log(`Processing images for ${tokens.length} tokens`);
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 3;
  const processedTokens = [...tokens]; // Create a copy to modify
  
  for (let i = 0; i < processedTokens.length; i += batchSize) {
    const batch = processedTokens.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} (${batch.length} tokens)`);
    
    // Process each token in the batch concurrently
    const results = await Promise.allSettled(batch.map(async (token, index) => {
      if (!token.logoUrl) {
        console.log(`No logo URL for token ${token.symbol || `at index ${i + index}`}, skipping`);
        return { success: false, index };
      }
      
      console.log(`Processing logo for ${token.symbol}: ${token.logoUrl}`);
      try {
        const cachedImageUrl = await cacheImageToStorage(token.logoUrl, token.symbol || `token${i + index}`);
        
        if (cachedImageUrl) {
          console.log(`Successfully cached logo for ${token.symbol}`);
          return { 
            success: true, 
            index,
            originalUrl: token.logoUrl,
            cachedUrl: cachedImageUrl 
          };
        } else {
          console.log(`Failed to cache logo for ${token.symbol}`);
          return { success: false, index };
        }
      } catch (error) {
        console.error(`Error processing logo for ${token.symbol}:`, error);
        return { success: false, index };
      }
    }));
    
    // Apply the results to the processed tokens
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const { index, cachedUrl, originalUrl } = result.value;
        processedTokens[i + index] = {
          ...processedTokens[i + index],
          logoUrl: cachedUrl,
          originalLogoUrl: originalUrl
        };
      }
    });
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < processedTokens.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`Finished processing images for all tokens`);
  return processedTokens;
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

    // Find existing valid cache entry
    const { data: cachedData, error: cacheError } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', cache_key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cacheError) {
      console.error('Error checking cache:', cacheError);
    }

    if (cachedData) {
      console.log('Returning cached market data');
      return new Response(JSON.stringify(cachedData.data), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

    console.log('No valid cache found, fetching fresh data from API');

    // Ensure the storage bucket exists
    await ensureStorageBucketExists();

    // Fetch fresh data if no valid cache
    const response = await fetch(API_URL, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const marketData = await response.json();
    
    // Process and cache all images with improved logging
    console.log('Processing and caching token images...');
    
    // Process images for different token categories
    console.log('Processing gainers...');
    const processedGainers = await processTokenImages(marketData.gainers || []);
    
    console.log('Processing losers...');
    const processedLosers = await processTokenImages(marketData.losers || []);
    
    console.log('Processing hot pools...');
    const processedHotPools = await processTokenImages(marketData.hotPools || []);
    
    // Combine processed data
    const processedData = {
      ...marketData,
      gainers: processedGainers,
      losers: processedLosers,
      hotPools: processedHotPools,
      lastUpdated: new Date().toISOString()
    };
    
    // Store in cache
    const expires = new Date(Date.now() + CACHE_DURATION);
    
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
        data: processedData,
        expires_at: expires.toISOString(),
        source: 'f3oci3ty.xyz'
      });

    if (insertError) {
      console.error('Error inserting cache:', insertError);
    } else {
      console.log(`Successfully fetched and cached market data with key: ${cache_key}`);
    }

    return new Response(JSON.stringify(processedData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('Error in fetchCryptoData:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch market data', details: error.message }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
