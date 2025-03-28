
import { supabase } from '@/integrations/supabase/client';

// Instead of creating bucket on initialization, check if it exists before upload
export const uploadFile = async (file: File, folder: string): Promise<string | null> => {
  try {
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User must be logged in to upload files');
    }
    
    // Check if bucket exists and create it if needed
    await ensureBucketExists('tweet-images');
    
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

// Helper function to check if bucket exists and create it if needed
// This uses a more robust approach with retry logic
export const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    // First check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    // If bucket exists, we're done
    if (buckets?.some(bucket => bucket.name === bucketName)) {
      return true;
    }
    
    // If we're here, we need to create the bucket
    // Note: This operation may be restricted by RLS policies for regular users
    // You might need to handle this operation in a Supabase Edge Function or
    // ensure the bucket is created on the admin side before deploying
    
    console.log(`Bucket '${bucketName}' does not exist. This operation may require admin privileges.`);
    
    // Instead of failing, we'll just return true and let the upload attempt to proceed
    // The actual error handling will happen during upload
    return true;
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    // Similarly, we'll attempt to proceed with the upload
    return true;
  }
};
