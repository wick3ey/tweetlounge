
import { supabase } from '@/integrations/supabase/client';

export const createBucketIfNotExists = async () => {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  
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
  }
  
  return true;
};

// Call this function when your app initializes
createBucketIfNotExists();
