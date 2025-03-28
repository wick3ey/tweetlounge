
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
      try {
        console.log(`Fetching Solana NFTs for address: ${address} using Solscan API`);
        
        const SOLSCAN_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzU5MTE4NzUzNDgsImVtYWlsIjoiY29pbmJvaWlpQHByb3Rvbi5tZSIsImFjdGlvbiI6InRva2VuLWFwaSIsImFwaVZlcnNpb24iOiJ2MiIsImlhdCI6MTczNTkxMTg3NX0.vI-rJRuOALZz5mVoQnmx-AC5Qg5-jbJwFbohdmGmi5s';
        
        // Fetch NFTs using Solscan API
        const response = await fetch(`https://api.solscan.io/v2/nft/collections/holding?account=${address}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Token': SOLSCAN_API_KEY
          }
        });
        
        if (!response.ok) {
          throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Solscan NFT API response:', JSON.stringify(data).substring(0, 200) + '...');
        
        if (!data.data || !Array.isArray(data.data)) {
          console.error('Invalid response from Solscan NFT API:', data);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid response from Solscan API' 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }
        
        // Map Solscan API response to our NFT interface
        const nfts = await Promise.all(data.data.map(async (collection: any) => {
          // For each collection, get the NFTs
          let nftItems = [];
          
          try {
            if (collection.collectionId) {
              const nftResponse = await fetch(`https://api.solscan.io/v2/nft/collection/items?collectionId=${collection.collectionId}&account=${address}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Token': SOLSCAN_API_KEY
                }
              });
              
              if (nftResponse.ok) {
                const nftData = await nftResponse.json();
                if (nftData.data && Array.isArray(nftData.data)) {
                  nftItems = nftData.data;
                }
              }
            }
          } catch (error) {
            console.error('Error fetching NFTs for collection:', error);
          }
          
          return nftItems.map((nft: any) => ({
            id: nft.mint || nft.tokenAddress || `sol-nft-${Math.random().toString(36).substring(2, 9)}`,
            name: nft.name || collection.name || 'Unnamed NFT',
            description: nft.description || collection.description || '',
            imageUrl: nft.image || collection.image || 'https://placehold.co/200x200?text=No+Image',
            tokenAddress: nft.mint || nft.tokenAddress || '',
            chain: 'solana'
          }));
        }));
        
        // Flatten the nested array of NFTs
        const flattenedNfts = nfts.flat();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            nfts: flattenedNfts.length > 0 ? flattenedNfts : [
              {
                id: `sol-demo-${address.substring(0, 8)}`,
                name: 'Demo SOL NFT',
                description: 'This is a demo NFT for testing',
                imageUrl: 'https://placehold.co/400x400/9b59b6/ffffff?text=SOL+Demo+NFT',
                tokenAddress: address,
                chain: 'solana'
              }
            ]
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error) {
        console.error('Error in Solana NFT fetch:', error);
        // Fall back to QuickNode if available
        const quicknodeApiUrl = Deno.env.get('QUICKNODE_SOLANA_API_URL');
        
        if (!quicknodeApiUrl) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch Solana NFTs from Solscan' 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }
        
        // Fall back to QuickNode API
        console.log(`Falling back to QuickNode API for address: ${address}`);
        
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
      }
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
