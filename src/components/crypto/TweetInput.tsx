
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Image, Link2, Smile } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'
import { createTweet } from '@/services/tweetService'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

const TweetInput: React.FC = () => {
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
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!content.trim() && !selectedImage) {
      toast({
        variant: "destructive",
        title: "Cannot post empty tweet",
        description: "Please add some text or an image to your tweet"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createTweet(content, selectedImage || undefined);
      
      if (!result) {
        throw new Error("Failed to create tweet");
      }
      
      setContent('');
      clearImage();
      
      toast({
        title: "Tweet posted!",
        description: "Your tweet has been shared with the world."
      });
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast({
        variant: "destructive",
        title: "Failed to post tweet",
        description: "Something went wrong. Please try again."
      });
    } finally {
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
