
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with service role for cache maintenance
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for authorization - only allow service role or specific API key
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = req.headers.get('x-api-key') || '';
  
  const validApiKey = Deno.env.get('CACHE_CLEANUP_API_KEY') || '';
  const isValidRequest = 
    authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '') || 
    apiKey === validApiKey;
  
  if (!isValidRequest) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    console.log("Starting cache cleanup process");
    
    // Get current time
    const now = new Date().toISOString();
    
    // First, count expired entries for reporting
    const { count: expiredCount, error: countError } = await supabaseAdmin
      .from('market_cache')
      .select('id', { count: 'exact', head: true })
      .lt('expires_at', now);
      
    if (countError) {
      throw new Error(`Error counting expired cache entries: ${countError.message}`);
    }
    
    // Delete expired cache entries
    const { error: deleteError } = await supabaseAdmin
      .from('market_cache')
      .delete()
      .lt('expires_at', now);
      
    if (deleteError) {
      throw new Error(`Error deleting expired cache entries: ${deleteError.message}`);
    }
    
    // Count remaining entries
    const { count: remainingCount, error: remainingError } = await supabaseAdmin
      .from('market_cache')
      .select('id', { count: 'exact', head: true });
      
    if (remainingError) {
      throw new Error(`Error counting remaining cache entries: ${remainingError.message}`);
    }
    
    console.log(`Cache cleanup complete. Deleted ${expiredCount} expired entries. ${remainingCount} entries remain.`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache cleanup complete`,
        stats: {
          deletedEntries: expiredCount,
          remainingEntries: remainingCount,
          cleanupTime: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error("Error in cleanMarketCache:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Cache cleanup failed", 
        message: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
