import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define the request body type
interface RequestBody {
  address: string;
  chain: 'ethereum' | 'solana';
}

// Define the response type
interface TokenResponse {
  tokens: Array<{
    name: string;
    symbol: string;
    logo?: string;
    amount: string;
    usdValue?: string;
    decimals: number;
    address: string;
  }>;
}

// Fetch Solana tokens using Solscan API
async function getSolanaTokens(address: string): Promise<TokenResponse> {
  try {
    const SOLSCAN_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzU5MTE4NzUzNDgsImVtYWlsIjoiY29pbmJvaWlpQHByb3Rvbi5tZSIsImFjdGlvbiI6InRva2VuLWFwaSIsImFwaVZlcnNpb24iOiJ2MiIsImlhdCI6MTczNTkxMTg3NX0.vI-rJRuOALZz5mVoQnmx-AC5Qg5-jbJwFbohdmGmi5s';
    
    // Fetch token holdings using Solscan API
    const response = await fetch(`https://api.solscan.io/v2/token/holdings?account=${address}`, {
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
    console.log('Solscan API response:', JSON.stringify(data).substring(0, 200) + '...');
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from Solscan API');
    }

    // Process and format token data
    const tokens = data.data.map((token: any) => {
      // Calculate real amount based on decimals
      const decimals = token.tokenInfo?.decimals || 0;
      const rawAmount = token.amount || '0';
      const amount = (parseInt(rawAmount) / Math.pow(10, decimals)).toString();
      
      // Calculate USD value if available
      let usdValue: string | undefined;
      if (token.price && token.price > 0) {
        usdValue = ((parseInt(rawAmount) / Math.pow(10, decimals)) * token.price).toFixed(2);
      }

      return {
        name: token.tokenInfo?.name || token.tokenInfo?.symbol || 'Unknown Token',
        symbol: token.tokenInfo?.symbol || 'UNKNOWN',
        logo: token.tokenInfo?.icon || undefined,
        amount: amount,
        usdValue: usdValue,
        decimals: decimals,
        address: token.tokenInfo?.mint || token.tokenAddress || '',
      };
    });

    // Filter out tokens with zero balance and sort by USD value
    const filteredTokens = tokens
      .filter(token => parseFloat(token.amount) > 0)
      .sort((a, b) => {
        const aValue = a.usdValue ? parseFloat(a.usdValue) : 0;
        const bValue = b.usdValue ? parseFloat(b.usdValue) : 0;
        return bValue - aValue;
      });

    return { tokens: filteredTokens };
  } catch (error) {
    console.error('Error fetching Solana tokens from Solscan:', error);
    return { tokens: [] }; // Return empty array in case of error
  }
}

// Fetch Ethereum tokens using Etherscan or similar API
// For now, we'll keep the mock data for Ethereum
function getEthereumTokens(address: string): TokenResponse {
  return {
    tokens: [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        logo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
        amount: '2.34',
        usdValue: '7842.60',
        decimals: 18,
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
      {
        name: 'Chainlink',
        symbol: 'LINK',
        logo: 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
        amount: '75.32',
        usdValue: '972.63',
        decimals: 18,
        address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        logo: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        amount: '250.00',
        usdValue: '250.00',
        decimals: 6,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      }
    ]
  };
}

// The main Deno server function
serve(async (req) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse the request body
    const { address, chain } = await req.json() as RequestBody;

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { headers, status: 400 }
      );
    }

    if (chain !== 'ethereum' && chain !== 'solana') {
      return new Response(
        JSON.stringify({ error: 'Invalid chain. Must be "ethereum" or "solana"' }),
        { headers, status: 400 }
      );
    }

    // Get tokens based on chain
    const response = chain === 'solana' 
      ? await getSolanaTokens(address) 
      : getEthereumTokens(address);

    // Return the response
    return new Response(
      JSON.stringify(response),
      { headers, status: 200 }
    );
  } catch (error) {
    console.error('Error in getWalletTokens function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to get wallet tokens' }),
      { headers, status: 500 }
    );
  }
});
