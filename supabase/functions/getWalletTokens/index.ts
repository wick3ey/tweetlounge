
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.89.1';

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

// Fetch Solana tokens using @solana/web3.js
async function getSolanaTokens(address: string): Promise<TokenResponse> {
  try {
    console.log(`Fetching Solana tokens for address: ${address} using web3.js`);
    
    // Create connection to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Convert address string to PublicKey
    const walletAddress = new PublicKey(address);
    
    // Get SOL balance
    const solBalance = await connection.getBalance(walletAddress);
    const solAmount = (solBalance / 1e9).toString(); // Convert lamports to SOL
    
    // Initialize tokens array with SOL
    const tokens = [{
      name: "Solana",
      symbol: "SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      amount: solAmount,
      usdValue: undefined, // We don't have price data in this basic implementation
      decimals: 9,
      address: "So11111111111111111111111111111111111111112"
    }];
    
    try {
      // Get all SPL token accounts owned by this wallet
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        walletAddress,
        {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token program ID
        }
      );
      
      console.log(`Found ${tokenAccounts.value.length} token accounts`);
      
      // Process each token account
      for (const account of tokenAccounts.value) {
        try {
          // Get token balance and info
          const accountInfo = account.account.data;
          const accountData = await connection.getTokenAccountBalance(account.pubkey);
          
          if (!accountData.value || !accountData.value.amount) {
            continue;
          }
          
          // Extract mint address
          // This requires parsing the account data which is complex
          // For simplicity, we'll extract it from the UI value
          const mintAddress = accountData.value.mint || "";
          const amount = accountData.value.uiAmount?.toString() || "0";
          const decimals = accountData.value.decimals || 0;
          
          // Skip if amount is 0
          if (parseFloat(amount) === 0) {
            continue;
          }
          
          // Get token metadata from our map or use defaults
          const metadata = tokenMetadata[mintAddress] || {
            name: `Token (${mintAddress.slice(0, 6)}...)`,
            symbol: "UNKNOWN",
            decimals: decimals
          };
          
          tokens.push({
            name: metadata.name,
            symbol: metadata.symbol,
            logo: metadata.logo,
            amount: amount,
            decimals: decimals,
            address: mintAddress
          });
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
    
    return { tokens: filteredTokens };
  } catch (error) {
    console.error('Error in getSolanaTokens:', error);
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
