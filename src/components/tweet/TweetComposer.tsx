
import { useState } from 'react';
import { ImageIcon, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/ui/use-toast';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { TweetComposerProps } from './TweetComposerProps';

const TweetComposer = ({ onTweetSubmit, placeholder = "What's happening?" }: TweetComposerProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const text = e.target.value;
    // Enforce the 280 character limit
    if (text.length <= 280) {
      setContent(text);
    }
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
      await onTweetSubmit(content, selectedImage || undefined);
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

  // Check if the user has a verified NFT profile picture
  const isNFTVerified = profile?.avatar_nft_id && profile?.avatar_nft_chain;

  // Calculate remaining characters
  const remainingChars = 280 - content.length;
  const isNearLimit = remainingChars <= 20;
  const isAtLimit = remainingChars <= 0;

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex gap-3">
        <Avatar className="h-12 w-12">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-twitter-blue text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-bold text-sm">{profile?.display_name}</span>
            
            {/* Modern Twitter-style Verified Badge */}
            {isNFTVerified && (
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="inline-flex items-center ml-1">
                    <div className="bg-red-500 rounded-full p-0.5 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white stroke-[3]" />
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 text-sm">
                  <p className="font-semibold">Verified NFT Owner</p>
                  <p className="text-gray-500 mt-1">
                    You're using an NFT you own as your profile picture.
                  </p>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
          
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={handleContentChange}
            rows={3}
            className="w-full resize-none border-0 focus-visible:ring-0 p-2 text-lg"
          />
          
          {imagePreview && (
            <div className="relative mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 rounded-full bg-black/50 text-white p-1" 
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
              <img 
                src={imagePreview} 
                alt="Selected media" 
                className="rounded-xl max-h-80 w-auto" 
              />
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-twitter-blue rounded-full" asChild>
                <label>
                  <ImageIcon className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <div className={`text-xs font-medium ${
                  isAtLimit ? 'text-red-500' : 
                  isNearLimit ? 'text-yellow-500' : 
                  'text-gray-400'
                }`}>
                  {remainingChars}
                </div>
              )}
              
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || (!content.trim() && !selectedImage) || isAtLimit}
                className="bg-twitter-blue hover:bg-twitter-blue/90 rounded-full"
              >
                {isSubmitting ? 'Posting...' : 'Tweet'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetComposer;
