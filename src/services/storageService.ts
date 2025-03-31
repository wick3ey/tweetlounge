
import { supabase } from '@/integrations/supabase/client';

export const createBucketsIfNotExist = async () => {
  try {
    // Check if tweet-images bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const tweetBucketExists = buckets?.some(bucket => bucket.name === 'tweet-images');
    const tokenBucketExists = buckets?.some(bucket => bucket.name === 'token-logos');
    
    let errors = false;
    
    if (!tweetBucketExists) {
      // Create tweet-images bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket('tweet-images', {
        public: true
      });
      
      if (error) {
        console.error('Error creating tweet-images bucket:', error);
        errors = true;
      }
    }
    
    if (!tokenBucketExists) {
      // Create token-logos bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket('token-logos', {
        public: true
      });
      
      if (error) {
        console.error('Error creating token-logos bucket:', error);
        errors = true;
      } else {
        console.log('Successfully created token-logos bucket');
      }
    }
    
    return !errors;
  } catch (err) {
    console.error('Error in createBucketsIfNotExist:', err);
    return false;
  }
};

// Enhanced function to handle token logo caching and retrieval
export const cacheTokenLogo = async (symbol: string, logoUrl: string, forceUpdate: boolean = false): Promise<string | null> => {
  try {
    if (!symbol || !logoUrl) {
      console.log(`Invalid inputs for cacheTokenLogo: symbol=${symbol}, logoUrl=${logoUrl}`);
      return null;
    }
    
    // Clean symbol name for use as filename (lowercase and remove special chars)
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    // Fix for various URL issues that might be present in token lists
    let safeLogoUrl = logoUrl;
    
    // Fix for Solana Labs token list URLs that may include 'pump' at the end
    if (logoUrl.includes('raw.githubusercontent.com/solana-labs/token-list') && logoUrl.endsWith('pump/logo.png')) {
      safeLogoUrl = logoUrl.replace('pump/logo.png', '/logo.png');
      console.log(`Corrected Solana Labs URL from ${logoUrl} to ${safeLogoUrl}`);
    }

    // Fix for URLs that don't have a proper protocol
    if (safeLogoUrl.startsWith('//')) {
      safeLogoUrl = `https:${safeLogoUrl}`;
      console.log(`Added https protocol to URL: ${safeLogoUrl}`);
    }

    // Check if we already have this logo cached (unless forceUpdate is true)
    if (!forceUpdate) {
      const { data: existingFiles, error: listError } = await supabase
        .storage
        .from('token-logos')
        .list('', {
          search: fileName
        });
      
      if (listError) {
        console.error(`Error checking if logo exists for ${symbol}:`, listError);
      }
      
      // If image already exists, return its public URL
      if (existingFiles && existingFiles.length > 0) {
        const { data } = supabase
          .storage
          .from('token-logos')
          .getPublicUrl(fileName);
        
        console.log(`Using cached logo for ${symbol}: ${data.publicUrl}`);
        return data.publicUrl;
      }
    }
    
    console.log(`Fetching and caching logo for ${symbol} from ${safeLogoUrl}`);
    
    try {
      // Fetch the image with improved error handling and longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased from 15)
      
      const imageResponse = await fetch(safeLogoUrl, {
        headers: {
          'Accept': 'image/png,image/jpeg,image/gif,image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal,
        cache: 'no-store' // Force fresh fetch
      });
      
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        console.warn(`Initial fetch failed for ${symbol} (${safeLogoUrl}): ${imageResponse.status} ${imageResponse.statusText}`);
        
        // Try alternative URLs if original fails
        const alternativeUrls = [];
        
        // If URL is from Solana token list and fails, try alternative formats
        if (safeLogoUrl.includes('raw.githubusercontent.com/solana-labs/token-list')) {
          // Try different path formats
          if (safeLogoUrl.includes('/main/')) {
            const originalPath = safeLogoUrl.split('/main/')[1];
            if (originalPath) {
              // Try without 'assets/mainnet' prefix
              alternativeUrls.push(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${originalPath}`);
              
              // Try with just the token address
              const possibleAddress = originalPath.split('/')[0];
              if (possibleAddress && possibleAddress.length > 30) {
                alternativeUrls.push(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${possibleAddress}/logo.png`);
              }
            }
          }
        }
        
        // For each alternative URL, try fetching
        for (const altUrl of alternativeUrls) {
          console.log(`Trying alternative URL for ${symbol}: ${altUrl}`);
          
          try {
            const altController = new AbortController();
            const altTimeoutId = setTimeout(() => altController.abort(), 20000);
            
            const altResponse = await fetch(altUrl, {
              headers: {
                'Accept': 'image/png,image/jpeg,image/gif,image/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              signal: altController.signal,
              cache: 'no-store'
            });
            
            clearTimeout(altTimeoutId);
            
            if (altResponse.ok) {
              // Alternative URL worked, use this response
              const imageBlob = await altResponse.blob();
              if (imageBlob.size === 0) {
                console.warn(`Received empty image from alternative URL for ${symbol}`);
                continue; // Try next alternative URL
              }
              
              // Upload to Supabase
              const { data, error } = await supabase
                .storage
                .from('token-logos')
                .upload(fileName, imageBlob, {
                  cacheControl: '3600', // 1 hour cache (increased from 30 minutes)
                  contentType: imageBlob.type || 'image/png',
                  upsert: true
                });
              
              if (error) {
                console.error(`Error uploading ${symbol} logo from alt URL:`, error);
                continue; // Try next alternative URL
              }
              
              // Get public URL
              const { data: urlData } = supabase
                .storage
                .from('token-logos')
                .getPublicUrl(fileName);
              
              console.log(`Successfully cached logo for ${symbol} using alt URL: ${urlData.publicUrl}`);
              return urlData.publicUrl;
            }
          } catch (altError) {
            console.warn(`Error trying alternative URL for ${symbol}:`, altError);
            // Continue to next alternative URL
          }
        }
        
        // As a last resort for popular tokens, try coingecko
        if (['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'RAY', 'JUP', 'WIF'].includes(symbol.toUpperCase())) {
          try {
            const coinGeckoUrl = `https://assets.coingecko.com/coins/images/small/${symbol.toLowerCase()}.png`;
            console.log(`Trying CoinGecko URL for ${symbol}: ${coinGeckoUrl}`);
            
            const cgController = new AbortController();
            const cgTimeoutId = setTimeout(() => cgController.abort(), 15000);
            
            const cgResponse = await fetch(coinGeckoUrl, {
              headers: {
                'Accept': 'image/png,image/jpeg,image/gif,image/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              signal: cgController.signal,
              cache: 'no-store'
            });
            
            clearTimeout(cgTimeoutId);
            
            if (cgResponse.ok) {
              const imageBlob = await cgResponse.blob();
              if (imageBlob.size > 0) {
                // Upload to Supabase
                const { data, error } = await supabase
                  .storage
                  .from('token-logos')
                  .upload(fileName, imageBlob, {
                    cacheControl: '3600',
                    contentType: imageBlob.type || 'image/png',
                    upsert: true
                  });
                
                if (!error) {
                  const { data: urlData } = supabase
                    .storage
                    .from('token-logos')
                    .getPublicUrl(fileName);
                  
                  console.log(`Successfully cached logo for ${symbol} using CoinGecko: ${urlData.publicUrl}`);
                  return urlData.publicUrl;
                }
              }
            }
          } catch (cgError) {
            console.warn(`Error trying CoinGecko fallback for ${symbol}:`, cgError);
          }
        }
        
        // If we get here, all attempts failed
        console.warn(`All attempts to fetch logo for ${symbol} failed. Using fallback.`);
        return generateFallbackLogoUrl(symbol);
      }
      
      // Check content type
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.warn(`Response for ${symbol} is not an image (${contentType})`);
        return generateFallbackLogoUrl(symbol);
      }
      
      // Get image as blob
      const imageBlob = await imageResponse.blob();
      
      // Check blob size
      if (imageBlob.size === 0) {
        console.warn(`Received empty image for ${symbol}`);
        return generateFallbackLogoUrl(symbol);
      }
      
      // Upload to Supabase
      const { data, error } = await supabase
        .storage
        .from('token-logos')
        .upload(fileName, imageBlob, {
          cacheControl: '3600', // 1 hour cache (increased from 30 minutes)
          contentType: imageBlob.type || 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error(`Error uploading ${symbol} logo:`, error);
        return generateFallbackLogoUrl(symbol);
      }
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('token-logos')
        .getPublicUrl(fileName);
      
      console.log(`Successfully cached logo for ${symbol}: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (fetchError) {
      console.error(`Error downloading logo for ${symbol}:`, fetchError);
      return generateFallbackLogoUrl(symbol);
    }
  } catch (err) {
    console.error(`Comprehensive error in cacheTokenLogo for ${symbol}:`, err);
    return generateFallbackLogoUrl(symbol);
  }
};

// Get cached token logo or return the original URL if not cached
export const getTokenLogo = async (symbol: string, originalUrl: string): Promise<string> => {
  try {
    if (!symbol || !originalUrl) return generateFallbackLogoUrl(symbol);
    
    // Try to get from cache first
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    const { data: existingFiles, error } = await supabase
      .storage
      .from('token-logos')
      .list('', {
        search: fileName
      });
      
    if (error) {
      console.error(`Error checking cached logo for ${symbol}:`, error);
      // Start caching in background and return original for now
      cacheTokenLogo(symbol, originalUrl, true).catch(console.error);
      return originalUrl;
    }
    
    // If image exists in cache, return its public URL
    if (existingFiles && existingFiles.length > 0) {
      const { data } = supabase
        .storage
        .from('token-logos')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    }
    
    // If not in cache, force caching attempt and wait for result
    console.log(`Logo for ${symbol} not found in cache, forcing download`);
    const cachedUrl = await cacheTokenLogo(symbol, originalUrl, true);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // If caching fails, return fallback
    return generateFallbackLogoUrl(symbol);
  } catch (err) {
    console.error(`Error getting logo for ${symbol}:`, err);
    return generateFallbackLogoUrl(symbol);
  }
};

// Generate a fallback logo URL based on symbol
export const generateFallbackLogoUrl = (symbol: string = '??'): string => {
  const symbolText = symbol ? symbol.substring(0, 2).toUpperCase() : '??';
  // Create a colored background with the symbol's first two letters
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%233b82f6' opacity='0.8'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='white' text-anchor='middle' dy='.3em'%3E${symbolText}%3C/text%3E%3C/svg%3E`;
};

// Initialize storage on app start
try {
  createBucketsIfNotExist().catch(err => {
    console.error('Failed to create storage buckets:', err);
  });
} catch (err) {
  console.error('Error initializing storage:', err);
}
