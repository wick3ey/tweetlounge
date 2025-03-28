
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey, GetProgramAccountsFilter } from 'https://esm.sh/@solana/web3.js@1.89.1';
import { TOKEN_PROGRAM_ID } from 'https://esm.sh/@solana/spl-token@0.3.11';

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

// Token name and symbol mapping for common tokens
const tokenMetadata: Record<string, { name: string, symbol: string, logo?: string, decimals: number }> = {
  "So11111111111111111111111111111111111111112": {
    name: "Solana",
    symbol: "SOL",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    decimals: 9
  },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    name: "USD Coin",
    symbol: "USDC",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    decimals: 6
  },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    name: "USDT",
    symbol: "USDT",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
    decimals: 6
  },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": {
    name: "Raydium",
    symbol: "RAY",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png",
    decimals: 6
  }
};

// Fetch Solana tokens using QuickNode and @solana/web3.js
async function getSolanaTokens(address: string): Promise<TokenResponse> {
  try {
    console.log(`Fetching Solana tokens for address: ${address} using QuickNode`);
    
    // Create connection to Solana mainnet via QuickNode
    const rpcEndpoint = 'https://dawn-few-emerald.solana-mainnet.quiknode.pro/090366e8738eb8dd20229127dadeb4e499f6cf5e/';
    const connection = new Connection(rpcEndpoint, 'confirmed');
    
    // Convert address string to PublicKey
    const walletAddress = new PublicKey(address);
    
    // Get SOL balance first
    const solBalance = await connection.getBalance(walletAddress);
    const solAmount = (solBalance / 1e9).toString(); // Convert lamports to SOL
    
    // Initialize tokens array with SOL
    const tokens = [{
      name: "Solana",
      symbol: "SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      amount: solAmount,
      usdValue: undefined, // We don't have price data in this implementation
      decimals: 9,
      address: "So11111111111111111111111111111111111111112"
    }];
    
    try {
      // Define filters for token accounts
      const filters: GetProgramAccountsFilter[] = [
        {
          dataSize: 165, // Size of token account (bytes)
        },
        {
          memcmp: {
            offset: 32, // Location of owner address in the account data
            bytes: address, // The wallet address we're looking for
          },
        }
      ];
      
      // Get all token accounts for this wallet
      console.log(`Fetching token accounts for wallet ${address}`);
      const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, // SPL Token program ID
        { filters: filters }
      );
      
      console.log(`Found ${accounts.length} token accounts`);
      
      // Process each token account
      for (const account of accounts) {
        try {
          // Parse the account data
          const parsedAccountInfo: any = account.account.data;
          const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
          const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
          const tokenDecimals: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
          
          // Skip if balance is 0
          if (tokenBalance === 0) {
            continue;
          }
          
          // Get token metadata from our map or use defaults
          const metadata = tokenMetadata[mintAddress] || {
            name: `Token (${mintAddress.slice(0, 6)}...)`,
            symbol: "UNKNOWN",
            decimals: tokenDecimals
          };
          
          tokens.push({
            name: metadata.name,
            symbol: metadata.symbol,
            logo: metadata.logo,
            amount: tokenBalance.toString(),
            decimals: tokenDecimals,
            address: mintAddress
          });
          
          console.log(`Found token: ${metadata.symbol}, balance: ${tokenBalance}`);
        } catch (error) {
          console.error(`Error processing token account:`, error);
          // Continue to next token account
        }
      }
    } catch (error) {
      console.error("Error fetching token accounts:", error);
      // Still return SOL balance
    }
    
    // Filter out tokens with zero balance and sort by amount
    const filteredTokens = tokens
      .filter(token => parseFloat(token.amount) > 0)
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    
    console.log(`Returning ${filteredTokens.length} Solana tokens`);
    return { tokens: filteredTokens };
  } catch (error) {
    console.error('Error in getSolanaTokens:', error);
    return { tokens: [] }; // Return empty array in case of error
  }
}

// Fetch Ethereum tokens using Etherscan or similar API
// For now, we'll keep the mock data for Ethereum
function getEthereumTokens(address: string): TokenResponse {
  const tokens = [
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
  ];
  
  console.log(`Returning ${tokens.length} Ethereum tokens`);
  return { tokens };
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
    
    console.log(`Returning ${response.tokens.length} tokens for ${chain} address ${address}`);

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
