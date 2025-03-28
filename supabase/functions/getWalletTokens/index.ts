
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define the headers for CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    return new Response(
      JSON.stringify({ 
        info: "This function has been deprecated. Please use getMetaplexTokens instead.",
        tokens: []
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (error) {
    console.error('Error in getWalletTokens function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Function deprecated', message: "Please use getMetaplexTokens instead" }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
