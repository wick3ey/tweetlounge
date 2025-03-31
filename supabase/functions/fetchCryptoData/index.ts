
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
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const marketData = await response.json();
    
    // Process and cache all images
    console.log('Processing and caching token images...');
    const processedData = {
      ...marketData,
      gainers: await processTokenImages(marketData.gainers),
      losers: await processTokenImages(marketData.losers),
      hotPools: await processTokenImages(marketData.hotPools)
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
