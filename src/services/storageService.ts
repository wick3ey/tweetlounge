
import { supabase } from '@/integrations/supabase/client';

export const createBucketIfNotExists = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'tweet-images');
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket('tweet-images', {
        public: true
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
      
      console.log('Successfully created tweet-images bucket');
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error creating bucket:', error);
    return false;
  }
};

// Function to upload an image to the tweet-images bucket
export const uploadTweetImage = async (file: File): Promise<string | null> => {
  try {
    const bucketExists = await createBucketIfNotExists();
    if (!bucketExists) {
      console.error('Tweet images bucket does not exist and could not be created');
      return null;
    }
    
    // Generate a unique file name with timestamp
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('tweet-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading tweet image:', error);
      return null;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tweet-images')
      .getPublicUrl(data.path);
    
    return publicUrl;
  } catch (error) {
    console.error('Unexpected error uploading tweet image:', error);
    return null;
  }
};

// Function to cache a token logo with retries and fallbacks
export const cacheTokenLogo = async (tokenId: string, logoUrl?: string): Promise<string | null> => {
  if (!logoUrl) return null;
  
  try {
    await createBucketIfNotExists();
    
    // Check if the logo is already cached
    const { data: existingFile } = await supabase.storage
      .from('tweet-images')
      .list(`token-logos`, {
        search: tokenId
      });
    
    // If we already have the file cached, return its public URL
    if (existingFile && existingFile.length > 0) {
      const { data: { publicUrl } } = supabase.storage
        .from('tweet-images')
        .getPublicUrl(`token-logos/${tokenId}`);
      
      return publicUrl;
    }
    
    // Use standard fetch with a timeout to get the image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(logoUrl, { 
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
      }
      
      // Convert response to blob
      const blob = await response.blob();
      
      // Check if we got a valid image
      if (!blob.type.startsWith('image/')) {
        throw new Error('Received non-image content');
      }
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('tweet-images')
        .upload(`token-logos/${tokenId}`, blob, {
          contentType: blob.type,
          cacheControl: '604800', // Cache for 1 week
          upsert: true
        });
      
      if (error) {
        console.error(`Error caching logo for ${tokenId}:`, error);
        return logoUrl; // Fall back to original URL
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tweet-images')
        .getPublicUrl(`token-logos/${tokenId}`);
      
      console.log(`Successfully cached logo for ${tokenId}`);
      return publicUrl;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`Error fetching logo for ${tokenId}:`, fetchError);
      return logoUrl; // Fall back to original URL
    }
  } catch (error) {
    console.error(`Unexpected error in cacheTokenLogo for ${tokenId}:`, error);
    return logoUrl; // Fall back to original URL
  }
};

// Function to download and cache all logos in a batch
export const cacheAllTokenLogos = async (tokens: Array<{id: string, logo?: string}>, batchSize = 5) => {
  const results = {
    total: tokens.length,
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    
    // Process batch in parallel
    const promises = batch.map(async (token) => {
      if (!token.logo) {
        results.skipped++;
        return null;
      }
      
      try {
        const cachedUrl = await cacheTokenLogo(token.id, token.logo);
        
        if (cachedUrl === token.logo) {
          // We fell back to the original URL
          results.failed++;
        } else if (cachedUrl) {
          results.success++;
        } else {
          results.failed++;
        }
        
        return cachedUrl;
      } catch (error) {
        results.failed++;
        console.error(`Failed to cache logo for ${token.id}:`, error);
        return null;
      }
    });
    
    // Wait for this batch to complete
    await Promise.all(promises);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
};

// Call this function when your app initializes
createBucketIfNotExists().catch(err => console.error('Failed to create bucket:', err));
