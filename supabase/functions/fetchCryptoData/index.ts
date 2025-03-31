
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

    // Fetch fresh data if no valid cache
    const response = await fetch(API_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const marketData = await response.json();
    
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
        data: marketData,
        expires_at: expires.toISOString(),
        source: 'f3oci3ty.xyz'
      });

    if (insertError) {
      console.error('Error inserting cache:', insertError);
    } else {
      console.log(`Successfully fetched and cached market data with key: ${cache_key}`);
    }

    return new Response(JSON.stringify(marketData), {
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
