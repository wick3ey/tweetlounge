import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Image, Link2, Smile } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'
import { createTweet } from '@/services/tweetService'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface TweetInputProps {
  onTweetPosted?: () => void;
}

const TweetInput: React.FC<TweetInputProps> = ({ onTweetPosted }) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return 'TL';
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    console.debug('[TweetInput] Content changed:', e.target.value.substring(0, 20) + (e.target.value.length > 20 ? '...' : ''));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.debug('[TweetInput] Image select triggered');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.debug('[TweetInput] Image selected:', file.name, 'Size:', (file.size / 1024).toFixed(2) + 'KB', 'Type:', file.type);
      setSelectedImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        console.debug('[TweetInput] Image preview created');
        setImagePreview(e.target?.result as string);
      };
      reader.onerror = (e) => {
        console.error('[TweetInput] Error creating image preview:', e);
      };
      reader.readAsDataURL(file);
    } else {
      console.debug('[TweetInput] No image file selected');
    }
  };

  const clearImage = () => {
    console.debug('[TweetInput] Clearing image');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    console.debug('[TweetInput] Submit button clicked');
    console.debug('[TweetInput] User state:', user ? 'Logged in' : 'Not logged in');
    console.debug('[TweetInput] Content length:', content.length, 'Has image:', !!selectedImage);
    
    if (!user) {
      console.error('[TweetInput] Authentication required for tweet submission');
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!content.trim() && !selectedImage) {
      console.error('[TweetInput] Empty tweet attempt');
      toast({
        variant: "destructive",
        title: "Cannot post empty tweet",
        description: "Please add some text or an image to your tweet"
      });
      return;
    }

    try {
      console.debug('[TweetInput] Setting isSubmitting to true');
      setIsSubmitting(true);
      
      console.debug('[TweetInput] Calling createTweet with content length:', content.length, 
                   'Image:', selectedImage ? `${selectedImage.name} (${selectedImage.size / 1024}KB)` : 'none');
      
      const result = await createTweet(content, selectedImage || undefined);
      console.debug('[TweetInput] createTweet result:', result ? 'Successful' : 'Failed');
      
      if (!result) {
        console.error('[TweetInput] createTweet returned falsy value');
        throw new Error("Failed to create tweet");
      }
      
      console.debug('[TweetInput] Tweet posted successfully, resetting form');
      setContent('');
      clearImage();
      
      toast({
        title: "Tweet posted!",
        description: "Your tweet has been shared with the world."
      });

      // First, trigger immediate feed refresh to update UI
      if (onTweetPosted) {
        console.debug('[TweetInput] Calling onTweetPosted callback to refresh feed');
        onTweetPosted();
      }

      // Force immediate broadcast to ensure other clients and components get notified
      try {
        console.debug('[TweetInput] Broadcasting tweet creation event');
        const broadcastChannel = supabase.channel('custom-all-channel');
        
        // Subscribe first to ensure connection is established
        await broadcastChannel.subscribe((status) => {
          console.debug(`[TweetInput] Broadcast subscription status: ${status}`);
        });
        
        // Then send the broadcast with enriched data
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'tweet-created',
          payload: { 
            id: result.id, 
            timestamp: new Date().toISOString(),
            userId: user.id,
            hasMedia: !!result.image_url
          }
        });
        
        console.debug('[TweetInput] Broadcast message sent successfully');
        
        // Remove channel after sending
        setTimeout(() => {
          supabase.removeChannel(broadcastChannel);
        }, 1000);
      } catch (error) {
        console.error('[TweetInput] Error broadcasting tweet creation event:', error);
      }

      // Force clear any profile data cache for current user
      try {
        localStorage.removeItem(`tweet-cache-profile-${user.id}-posts-limit:20-offset:0`);
        localStorage.removeItem(`profile-cache-profile-${user.id}-posts-limit:20-offset:0`);
        localStorage.removeItem(`profile-cache-profile-${user.id}-posts`);
        console.debug('[TweetInput] Cleared profile posts cache for current user');
      } catch (e) {
        console.error('[TweetInput] Error clearing profile cache:', e);
      }
    } catch (error) {
      console.error("[TweetInput] Error posting tweet:", error);
      toast({
        variant: "destructive",
        title: "Failed to post tweet",
        description: "Something went wrong. Please try again."
      });
    } finally {
      console.debug('[TweetInput] Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border border-gray-800 rounded-lg bg-black">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="mb-3">
            <textarea 
              className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-gray-500"
              placeholder="What's happening?"
              rows={2}
              value={content}
              onChange={handleContentChange}
            />
          </div>
          
          {imagePreview && (
            <div className="relative mt-3 mb-3 rounded-lg overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 rounded-full bg-black/50 text-white p-1 h-8 w-8" 
                onClick={clearImage}
              >
                <span className="sr-only">Remove image</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </Button>
              <img 
                src={imagePreview} 
                alt="Selected media" 
                className="rounded-lg max-h-80 w-auto" 
              />
            </div>
          )}
          
          <div className="flex justify-between items-center border-t border-gray-800 pt-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8" asChild>
                <label>
                  <Image className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </Button>
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8">
                <Link2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8">
                <Smile className="h-5 w-5" />
              </Button>
            </div>
            
            <Button 
              className="bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full px-4"
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !selectedImage)}
            >
              {isSubmitting ? 'Posting...' : 'Tweet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TweetInput
