
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { CryptoButton } from '@/components/ui/crypto-button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Image, X, Smile } from 'lucide-react';
import { replyToTweet } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface ReplyComposerProps {
  tweetId: string;
  onReplySuccess: () => void;
}

const ReplyComposer = ({ tweetId, onReplySuccess }: ReplyComposerProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent(prev => prev + emoji.native);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim() && !imageFile) {
      toast({
        title: "Empty Reply",
        description: "Please add text or an image to your reply",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await replyToTweet(tweetId, content, imageFile || undefined);
      
      if (success) {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        
        toast({
          title: "Reply Posted",
          description: "Your reply has been added successfully",
        });
        
        onReplySuccess();
      } else {
        throw new Error("Failed to post reply");
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast({
        title: "Post Failed",
        description: "There was an error posting your reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  // If no user is logged in, don't render the composer at all
  if (!user) return null;

  return (
    <div className="p-4 border-t border-gray-800 bg-crypto-darkgray">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.display_name || ''} />
          ) : null}
          <AvatarFallback className="bg-twitter-blue text-white">
            {getInitials(profile?.display_name || user.email || '')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea 
            placeholder="Post your reply..."
            className="min-h-[80px] bg-crypto-gray/15 border-gray-700 placeholder:text-gray-500 mb-3 focus-visible:ring-crypto-blue"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          
          {imagePreview && (
            <div className="relative inline-block mb-3">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-60 rounded-lg border border-gray-700" 
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-black/70 rounded-full"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-crypto-blue hover:bg-crypto-blue/10 p-2 rounded-full transition-colors"
              >
                <Image className="h-5 w-5" />
              </button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-crypto-blue hover:bg-crypto-blue/10 p-2 rounded-full transition-colors">
                    <Smile className="h-5 w-5" />
                  </button>
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
            
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            
            <CryptoButton
              variant="default"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={(!content.trim() && !imageFile) || isSubmitting}
            >
              Reply
            </CryptoButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyComposer;
