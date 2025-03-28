
export async function replyToTweet(tweetId: string, content: string, imageFile?: File): Promise<boolean> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided for reply');
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      throw new Error('User must be logged in to reply to a tweet');
    }
    
    // Verify the tweet exists before attempting to reply
    const { data: tweetExists, error: tweetCheckError } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();
      
    if (tweetCheckError || !tweetExists) {
      console.error('Tweet does not exist or cannot be accessed:', tweetCheckError);
      return false;
    }
    
    let imageUrl = null;
    
    if (imageFile) {
      try {
        imageUrl = await uploadFile(imageFile, 'tweet-replies');
        
        if (!imageUrl) {
          console.warn('Failed to upload image but continuing with text-only reply');
          // We'll continue with a text-only reply instead of failing completely
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue with text-only reply
      }
    }
    
    const replyData = {
      content: content.trim(),
      user_id: userData.user.id,
      tweet_id: tweetId,
      image_url: imageUrl
    };
    
    const { error } = await supabase
      .from('replies')
      .insert(replyData);
      
    if (error) {
      console.error('Error replying to tweet:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Reply action failed:', error);
    return false;
  }
}

export async function getTweetReplies(tweetId: string): Promise<any[]> {
  try {
    if (!tweetId || !tweetId.trim()) {
      console.error('Invalid tweet ID provided');
      return [];
    }
    
    // Verify the tweet exists before fetching replies
    const { data: tweetExists, error: tweetCheckError } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();
      
    if (tweetCheckError) {
      console.error('Error verifying tweet existence:', tweetCheckError);
      // We'll still attempt to fetch replies in case it's a permissions issue
    }
    
    const { data, error } = await supabase
      .from('replies')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching tweet replies:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch tweet replies:', error);
    return [];
  }
}
