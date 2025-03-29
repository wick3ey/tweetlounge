
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    }
  }
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting market cache cleanup");
    
    // Find all expired cache entries
    const now = new Date();
    const { data: expiredData, error: queryError } = await supabaseAdmin
      .from('market_cache')
      .select('id, cache_key, expires_at')
      .lt('expires_at', now.toISOString());
    
    if (queryError) {
      console.error("Error finding expired cache entries:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to query expired cache entries" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Found ${expiredData?.length || 0} expired cache entries`);
    
    if (!expiredData || expiredData.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired cache entries to clean" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Delete expired entries
    const { error: deleteError } = await supabaseAdmin
      .from('market_cache')
      .delete()
      .lt('expires_at', now.toISOString());
    
    if (deleteError) {
      console.error("Error deleting expired cache entries:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete expired cache entries" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Successfully cleaned up ${expiredData.length} expired cache entries`);
    
    // Return success
    return new Response(
      JSON.stringify({ 
        message: `Successfully cleaned up ${expiredData.length} expired cache entries`,
        cleaned: expiredData.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error cleaning market cache:", error);
    return new Response(
      JSON.stringify({ error: "Failed to clean market cache" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
