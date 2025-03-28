
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.89.1';
import { TOKEN_PROGRAM_ID } from 'https://esm.sh/@solana/spl-token@0.3.11';

// Define response headers for CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Define the request body type
interface RequestBody {
  address: string;
}

// Define the token type
interface Token {
  name: string;
  symbol: string;
  logo?: string;
  amount: string;
  decimals: number;
  address: string;
  chain: 'solana';
  explorerUrl?: string;
}

/**
 * Fetch token metadata using on-chain data and token registries
 * @param mintAddress The token mint address
 * @returns Token metadata
 */
async function getTokenMetadata(mintAddress: string): Promise<{ name: string; symbol: string; logo?: string; decimals: number }> {
  try {
    console.log(`Fetching metadata for token: ${mintAddress}`);
    
    // First try Jupiter API for token information
    try {
      const response = await fetch('https://token.jup.ag/all');
      if (response.ok) {
        const tokens = await response.json();
        const token = tokens.find((t: any) => t.address === mintAddress);
        
        if (token) {
          console.log(`Found token in Jupiter API: ${token.name} (${token.symbol})`);
          return {
            name: token.name,
            symbol: token.symbol,
            logo: token.logoURI,
            decimals: token.decimals
          };
        }
      }
    } catch (jupiterError) {
      console.error(`Error fetching from Jupiter API:`, jupiterError);
    }
    
    // Try SolScan API as a fallback
    try {
      const response = await fetch(`https://api.solscan.io/token/meta?token=${mintAddress}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.success && data.data) {
          console.log(`Found token in SolScan API: ${data.data.name} (${data.data.symbol})`);
          return {
            name: data.data.name || 'Unknown Token',
            symbol: data.data.symbol || 'UNKNOWN',
            logo: data.data.icon || undefined,
            decimals: data.data.decimals || 0
          };
        }
      }
    } catch (solscanError) {
      console.error(`Error fetching from SolScan API:`, solscanError);
    }
    
    // Return default values if no metadata found
    return {
      name: `Unknown Token (${mintAddress.slice(0, 6)}...)`,
      symbol: "UNKNOWN",
      decimals: 0
    };
  } catch (error) {
    console.error(`Error in getTokenMetadata:`, error);
    return {
      name: `Unknown Token (${mintAddress.slice(0, 6)}...)`,
      symbol: "UNKNOWN",
      decimals: 0
    };
  }
}

/**
 * Fetch Solana tokens using @solana/web3.js - memory optimized version
 */
async function getSolanaTokens(address: string): Promise<{ tokens: Token[] }> {
  try {
    console.log(`Fetching Solana tokens for address: ${address}`);
    
    // Create connection to Solana mainnet
    const rpcEndpoint = 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcEndpoint, 'confirmed');
    
    // Convert address string to PublicKey
    const walletAddress = new PublicKey(address);
    
    // Get SOL balance first
    const solBalance = await connection.getBalance(walletAddress);
    const solAmount = (solBalance / 1e9).toString(); // Convert lamports to SOL
    
    // Initialize tokens array with SOL
    const tokens: Token[] = [{
      name: "Solana",
      symbol: "SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      amount: solAmount,
      decimals: 9,
      address: "So11111111111111111111111111111111111111112",
      chain: "solana" as const,
      explorerUrl: "https://solscan.io/token/So11111111111111111111111111111111111111112"
    }];
    
    try {
      // Get all token accounts for this wallet with smaller batch size
      console.log(`Fetching token accounts for wallet ${address}`);
      
      // Instead of getting all at once, which could be memory intensive
      const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
        walletAddress,
        { programId: TOKEN_PROGRAM_ID },
        { commitment: 'confirmed' }
      );
      
      console.log(`Found ${tokenAccountsResponse.value.length} SPL token accounts`);
      
      // Process each token account and fetch metadata only for non-zero balances
      const tokenPromises = [];
      
      for (const account of tokenAccountsResponse.value) {
        const tokenInfo = account.account.data.parsed.info;
        const mintAddress = tokenInfo.mint;
        const balance = tokenInfo.tokenAmount.uiAmount;
        const decimals = tokenInfo.tokenAmount.decimals;
        
        // Skip tokens with zero balance to reduce unnecessary processing
        if (balance === 0) {
          continue;
        }
        
        console.log(`Processing token with balance > 0: ${mintAddress}, balance: ${balance}`);
        
        // Add promise to the array
        tokenPromises.push(
          getTokenMetadata(mintAddress).then(metadata => {
            return {
              name: metadata.name,
              symbol: metadata.symbol,
              logo: metadata.logo,
              amount: balance.toString(),
              decimals: decimals,
              address: mintAddress,
              chain: "solana" as const,
              explorerUrl: `https://solscan.io/token/${mintAddress}`
            };
          }).catch(error => {
            console.error(`Error processing token ${mintAddress}:`, error);
            return null;
          })
        );
      }
      
      // Process tokens in parallel, but with a limit to avoid memory issues
      const batchSize = 5;
      const allTokens = [];
      
      for (let i = 0; i < tokenPromises.length; i += batchSize) {
        const batch = tokenPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        
        // Filter out any null results from errors
        const validResults = batchResults.filter(token => token !== null);
        allTokens.push(...validResults);
      }
      
      // Add non-zero tokens to our array
      tokens.push(...allTokens);
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

// The main Deno server function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { address } = await req.json() as RequestBody;

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const response = await getSolanaTokens(address);
    console.log(`Returning ${response.tokens.length} tokens for address ${address}`);

    // Return the response
    return new Response(
      JSON.stringify(response),
      { headers: corsHeaders, status: 200 }
    );
  } catch (error) {
    console.error('Error in getMetaplexTokens function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to get wallet tokens', message: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
