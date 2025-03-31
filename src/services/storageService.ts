
import { supabase } from '@/integrations/supabase/client';

export const createBucketsIfNotExist = async () => {
  // Check if tweet-images bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  
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
      // Set public access policy
      console.log('Setting up public access for token-logos bucket');
    }
  }
  
  return !errors;
};

// Call this function when your app initializes
createBucketsIfNotExist();
