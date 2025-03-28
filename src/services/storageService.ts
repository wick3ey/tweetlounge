
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

export const uploadFile = async (file: File, folder: string): Promise<string | null> => {
  try {
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User must be logged in to upload files');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.data.user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('tweet-images')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('tweet-images')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error('File upload failed:', error);
    return null;
  }
};
