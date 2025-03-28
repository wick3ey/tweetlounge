
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.89.1';
import { Metaplex } from 'https://esm.sh/@metaplex-foundation/js@0.18.0';

// Define the request body type
interface RequestBody {
  address: string;
}

// Define the response type
interface TokenResponse {
  tokens: Array<{
    name: string;
    symbol: string;
    logo?: string;
    amount: string;
    decimals: number;
    address: string;
  }>;
}

// Fetch Solana tokens using Metaplex
async function getSolanaTokensWithMetaplex(address: string): Promise<TokenResponse> {
  try {
    console.log(`Fetching Solana tokens with Metaplex for address: ${address}`);
    
    // Create connection to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const metaplex = new Metaplex(connection);
    
    // Convert address string to PublicKey
    const walletAddress = new PublicKey(address);
    
    // 1) Get all SPL token accounts for this wallet
    console.log(`Fetching token accounts for wallet ${address}`);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { 
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      }
    );
    
    console.log(`Found ${tokenAccounts.value.length} SPL token accounts`);
    
    const tokens = [];
    
    // Process each token account
    for (let i = 0; i < tokenAccounts.value.length; i++) {
      try {
        const tokenAccount = tokenAccounts.value[i];
        const info = tokenAccount.account.data.parsed.info;
        const mintAddress = info.mint;
        const decimals = info.tokenAmount.decimals;
        const amountRaw = info.tokenAmount.amount;
        const balance = Number(amountRaw) / (10 ** decimals);
        
        // Skip tokens with zero balance
        if (balance === 0) {
          continue;
        }
        
        console.log(`Processing token #${i + 1}: ${mintAddress}, balance: ${balance}`);
        
        let name = `Unknown (${mintAddress.slice(0, 6)}...)`;
        let symbol = "???";
        let logo = undefined;
        
        // 2) Try to load Metaplex metadata
        try {
          const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) });
          
          if (nft) {
            name = nft.name || name;
            symbol = nft.symbol || symbol;
            
            if (nft.json && nft.json.image) {
              logo = nft.json.image;
              console.log(`Found image URL: ${logo}`);
            }
            
            console.log(`Metaplex metadata found: ${name} (${symbol})`);
          }
        } catch (err) {
          console.log(`No Metaplex metadata for mint ${mintAddress}: ${err.message}`);
          // Continue without metadata - we'll use default values
        }
        
        // Add the token to our list
        tokens.push({
          name: name,
          symbol: symbol,
          logo: logo,
          amount: balance.toString(),
          decimals: decimals,
          address: mintAddress
        });
        
      } catch (error) {
        console.error(`Error processing token account:`, error);
        // Continue to next token account
      }
    }
    
    // SOL is not an SPL token, so we need to add it separately
    try {
      const solBalance = await connection.getBalance(walletAddress);
      const solAmount = (solBalance / 1e9).toString(); // Convert lamports to SOL
      
      // Add SOL to the tokens list
      tokens.unshift({
        name: "Solana",
        symbol: "SOL",
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        amount: solAmount,
        decimals: 9,
        address: "So11111111111111111111111111111111111111112"
      });
      
      console.log(`Added SOL balance: ${solAmount}`);
    } catch (error) {
      console.error("Error fetching SOL balance:", error);
    }
    
    console.log(`Returning ${tokens.length} Solana tokens`);
    return { tokens };
  } catch (error) {
    console.error('Error in getSolanaTokensWithMetaplex:', error);
    return { tokens: [] }; // Return empty array in case of error
  }
}

// The main Deno server function
serve(async (req) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse the request body
    const { address } = await req.json() as RequestBody;

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { headers, status: 400 }
      );
    }

    // Get tokens using Metaplex
    const response = await getSolanaTokensWithMetaplex(address);
    
    console.log(`Returning ${response.tokens.length} tokens for address ${address}`);

    // Return the response
    return new Response(
      JSON.stringify(response),
      { headers, status: 200 }
    );
  } catch (error) {
    console.error('Error in getMetaplexTokens function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to get wallet tokens', message: error.message }),
      { headers, status: 500 }
    );
  }
});
