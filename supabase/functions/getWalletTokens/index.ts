
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

// Mock function to simulate token fetching from Solana
function getSolanaTokens(address: string): TokenResponse {
  // In a real implementation, you would call the Solana RPC API
  // or a service like Solscan API to get real token data
  return {
    tokens: [
      {
        name: 'Solana',
        symbol: 'SOL',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        amount: '12.45',
        usdValue: '1245.00',
        decimals: 9,
        address: 'So11111111111111111111111111111111111111112',
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        amount: '543.21',
        usdValue: '543.21',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      },
      {
        name: 'Raydium',
        symbol: 'RAY',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
        amount: '125.75',
        usdValue: '89.28',
        decimals: 6,
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      },
      {
        name: 'Bonk',
        symbol: 'BONK',
        logo: 'https://assets.coingecko.com/coins/images/28412/standard/bonk.png',
        amount: '14532023.89',
        usdValue: '72.66',
        decimals: 5,
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      }
    ]
  };
}

// Mock function to simulate token fetching from Ethereum
function getEthereumTokens(address: string): TokenResponse {
  // In a real implementation, you would call the Ethereum API
  // or a service like Etherscan API to get real token data
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
      ? getSolanaTokens(address) 
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
