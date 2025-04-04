
import { supabase } from '@/integrations/supabase/client';

export const validateTweetsBucket = async () => {
  // Check if bucket exists
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error checking buckets:', error);
    return false;
  }
  
  const bucketExists = buckets?.some(bucket => bucket.name === 'tweets');
  
  if (!bucketExists) {
    console.error('Tweets bucket does not exist. Please contact administrator.');
    return false;
  }
  
  return true;
};

// Call this function when your app initializes to validate that the bucket exists
validateTweetsBucket();
