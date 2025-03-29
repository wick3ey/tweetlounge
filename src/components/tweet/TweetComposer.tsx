
import { useState, useRef } from 'react';
import { ImageIcon, X, Link2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TweetComposerProps } from './TweetComposerProps';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const TweetComposer = ({ onTweetSubmit, placeholder = "What's happening?" }: TweetComposerProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent(prev => prev + emoji.native);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      console.log('[TweetComposer] Submitting tweet with content:', content.substring(0, 20) + (content.length > 20 ? '...' : ''));
      setIsSubmitting(true);
      
      const result = await onTweetSubmit(content, selectedImage || undefined);
      console.log('[TweetComposer] Tweet submission result:', result);
      
      setContent('');
      clearImage();
      
      toast({
        title: "Tweet posted!",
        description: "Your tweet has been shared with the world."
      });
    } catch (error) {
      console.error("[TweetComposer] Error posting tweet:", error);
      toast({
        variant: "destructive",
        title: "Failed to post tweet",
        description: "Something went wrong. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate remaining characters
  const remainingChars = 280 - content.length;
  const isNearLimit = remainingChars <= 20;
  const isAtLimit = remainingChars <= 0;

  return (
    <div className="p-4 rounded-xl bg-crypto-darkgray border border-crypto-gray/50 mb-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 mt-1">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-twitter-blue text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={handleContentChange}
            rows={2}
            className="w-full resize-none border-crypto-gray/40 bg-crypto-gray/15 focus-visible:ring-crypto-blue focus-visible:border-crypto-blue p-2 text-base placeholder:text-crypto-lightgray"
          />
          
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 rounded-full bg-black/50 text-white p-1 h-8 w-8" 
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
          
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-crypto-gray/40">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="text-crypto-blue rounded-full p-2 h-8 w-8" asChild>
                <label>
                  <ImageIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                  />
                </label>
              </Button>
              <Button variant="ghost" size="sm" className="text-crypto-blue rounded-full p-2 h-8 w-8">
                <Link2 className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-crypto-blue rounded-full p-2 h-8 w-8">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 border-crypto-gray/40 bg-crypto-darkgray" align="start">
                  <Picker 
                    data={data} 
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    previewPosition="none"
                    searchPosition="top"
                  />
                </PopoverContent>
              </Popover>
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
                className="bg-crypto-blue hover:bg-crypto-blue/90 rounded-full px-4 py-1 h-8"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetComposer;
