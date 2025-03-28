
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the request body
    const { address, chain } = await req.json();
    
    // Create a Supabase client with the Auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check which chain to fetch NFTs for
    if (chain === 'solana') {
      // Get the QuickNode API URL from environment variable
      const quicknodeApiUrl = Deno.env.get('QUICKNODE_SOLANA_API_URL');
      
      if (!quicknodeApiUrl) {
        throw new Error('QuickNode Solana API URL not configured');
      }
      
      console.log(`Fetching Solana NFTs for address: ${address} using QuickNode API`);
      
      const response = await fetch(quicknodeApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: address,
            limit: 50,
            options: {
              showFungible: false,
              showCollectionMetadata: true
            }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.result || !data.result.items || !Array.isArray(data.result.items)) {
        console.error('Invalid response from QuickNode API:', data);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid response from QuickNode API' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
      
      // Map QuickNode API response to our NFT interface
      const nfts = data.result.items.map((item) => {
        const asset = item.content ? item : item.asset;
        return {
          id: asset.id,
          name: asset.content?.metadata?.name || 'Unnamed NFT',
          description: asset.content?.metadata?.description || '',
          imageUrl: asset.content?.links?.image || asset.content?.files?.[0]?.uri || 'https://placehold.co/200x200?text=No+Image',
          tokenAddress: asset.id,
          chain: 'solana'
        };
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          nfts 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (chain === 'ethereum') {
      // For Ethereum NFTs, we'll handle them separately
      // In a production environment, you'd fetch the Alchemy API key from env vars
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ethereum NFT fetching should be handled client-side for now' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid chain specified' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
  } catch (error) {
    console.error('Error in getNFTs edge function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal Server Error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
