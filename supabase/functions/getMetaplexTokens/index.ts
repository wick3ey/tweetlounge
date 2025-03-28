
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.89.1';

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

// Token metadata mapping for commonly used tokens with accurate information
const knownTokens: Record<string, { name: string, symbol: string, logo?: string }> = {
  "So11111111111111111111111111111111111111112": {
    name: "Solana",
    symbol: "SOL",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
  },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    name: "USD Coin",
    symbol: "USDC",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
  },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    name: "USDT",
    symbol: "USDT",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png"
  },
  "6o5jzMo3QDQt8ST8wtRf5bDKZZXSg61hK6mMxgU54JXh": {
    name: "Donald Token", // Corrected name
    symbol: "DONALD", // Corrected symbol
    logo: "https://solana-coin-logos.s3.amazonaws.com/donald.png" // Updated logo URL
  },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": {
    name: "Raydium",
    symbol: "RAY",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png"
  },
  "HQS6Sq6dVwssSK5FEFDGeTK76Rd7u3EpxpExpB1oAJP5": {
    name: "Metaplex NFT",
    symbol: "NFT",
    logo: "https://arweave.net/1ToMGgNcWI_tKBDgPGYTWrTdmqyNLo24KrLb9cYvlrw"
  }
};

// Try to get metadata from token account data
function extractMetadataFromAccountInfo(buffer: Uint8Array): { name?: string, symbol?: string, uri?: string } | null {
  try {
    // Very simplified parser to try to extract metadata
    const decoder = new TextDecoder();
    const dataString = decoder.decode(buffer);
    
    // Try to extract name, symbol, and URI using regex patterns
    const nameMatch = dataString.match(/"name":"([^"]+)"/);
    const symbolMatch = dataString.match(/"symbol":"([^"]+)"/);
    const uriMatch = dataString.match(/"uri":"([^"]+)"/);
    
    if (nameMatch || symbolMatch || uriMatch) {
      return {
        name: nameMatch?.[1],
        symbol: symbolMatch?.[1],
        uri: uriMatch?.[1]
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting metadata:", error);
    return null;
  }
}

// Fetch Solana tokens
async function getSolanaTokens(address: string): Promise<TokenResponse> {
  try {
    console.log(`Fetching Solana tokens for address: ${address}`);
    
    // Create connection to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
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
        
        // First check our known tokens mapping
        let tokenInfo = knownTokens[mintAddress];
        
        // Try to get metadata from token metadata account
        if (!tokenInfo) {
          try {
            // Get metadata PDA for this mint
            const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
            const metadataPDA = PublicKey.findProgramAddressSync(
              [
                Buffer.from('metadata'),
                new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
                new PublicKey(mintAddress).toBuffer()
              ],
              new PublicKey(METADATA_PROGRAM_ID)
            )[0];
            
            // Try to get token metadata
            const metadataAccount = await connection.getAccountInfo(metadataPDA);
            
            if (metadataAccount) {
              const metadata = extractMetadataFromAccountInfo(metadataAccount.data);
              
              if (metadata) {
                tokenInfo = {
                  name: metadata.name || `Token (${mintAddress.slice(0, 6)}...)`,
                  symbol: metadata.symbol || "SPL",
                  logo: metadata.uri
                };
              }
            }
          } catch (err) {
            console.log(`Error fetching on-chain metadata: ${err}`);
          }
        }
        
        // Use defaults if we don't have metadata
        const name = tokenInfo?.name || `Token (${mintAddress.slice(0, 6)}...)`;
        const symbol = tokenInfo?.symbol || "SPL";
        const logo = tokenInfo?.logo;
        
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
    console.error('Error in getSolanaTokens:', error);
    return { tokens: [] }; // Return empty array in case of error
  }
}

// The main Deno server function
serve(async (req) => {
  // Set CORS headers to fix the CORS issues
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
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

    // Get tokens with our improved approach
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
