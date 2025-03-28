
import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CryptoButton } from '../ui/crypto-button'
import { Image, Link, Smile, User, Video, X } from 'lucide-react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useToast } from '@/components/ui/use-toast'
import { createTweet } from '@/services/tweetService'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const TweetInput: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      setSelectedFile(file);
      setFileType('image');
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileType('video');
      
      // Create video preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent(prev => prev + emoji.native);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      return;
    }

    if (!content.trim() && !selectedFile) {
      toast({
        variant: "destructive",
        title: "Cannot post empty tweet",
        description: "Please add some text or media to your tweet"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createTweet(content, selectedFile || undefined);
      setContent('');
      clearFile();
      
      toast({
        title: "Tweet posted!",
        description: "Your tweet has been shared with the world."
      });
      
      // Refresh the page to show the new tweet
      window.location.reload();
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

  // Calculate remaining characters
  const remainingChars = 280 - content.length;
  const isNearLimit = remainingChars <= 20;
  const isAtLimit = remainingChars <= 0;

  return (
    <Card className="crypto-stats-card">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 border border-crypto-gray/50">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Profile" />
            ) : (
              <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                {getInitials()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1">
            <div className="mb-3">
              <textarea 
                className="w-full bg-transparent border-none resize-none focus:outline-none text-crypto-text placeholder:text-crypto-lightgray"
                placeholder="Vad händer i kryptovärlden?"
                rows={2}
                value={content}
                onChange={handleContentChange}
              />
            </div>
            
            {filePreview && (
              <div className="relative mt-3 mb-3 rounded-xl overflow-hidden border border-crypto-gray/30">
                <button 
                  className="absolute top-2 right-2 rounded-full bg-black/50 text-white p-1 h-8 w-8 flex items-center justify-center" 
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                </button>
                
                {fileType === 'image' ? (
                  <img 
                    src={filePreview} 
                    alt="Selected media" 
                    className="rounded-xl max-h-80 w-auto" 
                  />
                ) : (
                  <video 
                    src={filePreview}
                    controls
                    className="rounded-xl max-h-80 w-full"
                  />
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-5 w-5" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </button>
                
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors" onClick={() => videoInputRef.current?.click()}>
                  <Video className="h-5 w-5" />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoSelect}
                  />
                </button>
                
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors">
                  <Link className="h-5 w-5" />
                </button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 border-crypto-gray/40 bg-crypto-darkgray" align="start">
                    <Picker 
                      data={data} 
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
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
                
                <CryptoButton 
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!content.trim() && !selectedFile) || isAtLimit}
                >
                  {isSubmitting ? 'Posting...' : 'Tweet'}
                </CryptoButton>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TweetInput
