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
export const cacheTokenLogo = async (symbol: string, logoUrl: string): Promise<string | null> => {
  try {
    if (!symbol || !logoUrl) {
      console.log(`Invalid inputs for cacheTokenLogo: symbol=${symbol}, logoUrl=${logoUrl}`);
      return null;
    }
    
    // Clean symbol name for use as filename (lowercase and remove special chars)
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    // Check if logo is from Solana Labs token list, modify URL if needed
    const isSolanaTokenList = logoUrl.includes('raw.githubusercontent.com/solana-labs/token-list');
    const safeLogoUrl = isSolanaTokenList ? logoUrl : logoUrl;

    // First check if we already have this logo cached
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
    
    console.log(`Fetching and caching logo for ${symbol} from ${safeLogoUrl}`);
    
    try {
      // Fetch the image with timeout and proper headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const imageResponse = await fetch(safeLogoUrl, {
        headers: {
          'Accept': 'image/png,image/jpeg,image/gif,image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        console.warn(`Failed to fetch logo for ${symbol}: ${imageResponse.status} ${imageResponse.statusText}`);
        return null;
      }
      
      // Check content type
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.warn(`Response for ${symbol} is not an image (${contentType})`);
        return null;
      }
      
      // Get image as blob
      const imageBlob = await imageResponse.blob();
      
      // Check blob size
      if (imageBlob.size === 0) {
        console.warn(`Received empty image for ${symbol}`);
        return null;
      }
      
      // Upload to Supabase
      const { data, error } = await supabase
        .storage
        .from('token-logos')
        .upload(fileName, imageBlob, {
          cacheControl: '1800', // 30 minutes cache
          contentType: imageBlob.type || 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error(`Error uploading ${symbol} logo:`, error);
        return null;
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
      return null;
    }
  } catch (err) {
    console.error(`Comprehensive error in cacheTokenLogo for ${symbol}:`, err);
    return null;
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
      cacheTokenLogo(symbol, originalUrl).catch(console.error);
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
    
    // If not in cache, start caching process in background and try direct download first
    const cachedUrl = await cacheTokenLogo(symbol, originalUrl);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // If caching fails, return original
    return originalUrl;
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
