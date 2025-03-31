
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

    // Attempt to get the cache key from the request body
    const { cache_key = 'market_data_v1' } = await req.json() || {};

    // Find existing valid cache entry
    const { data: cachedData, error: cacheError } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', cache_key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('Returning cached market data');
      return new Response(JSON.stringify(cachedData.data), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

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
    await supabase.from('market_cache').delete().eq('cache_key', cache_key);
    await supabase.from('market_cache').insert({
      cache_key: cache_key,
      data: marketData,
      expires_at: expires.toISOString(),
      source: 'f3oci3ty.xyz'
    });

    console.log('Successfully fetched and cached market data');

    return new Response(JSON.stringify(marketData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('Error in fetchCryptoData:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch market data' }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
