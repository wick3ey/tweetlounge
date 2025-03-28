
import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader, ImagePlus, Link2, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import CoverImageCropper from './CoverImageCropper';

interface ProfileEditFormProps {
  onClose?: () => void;
}

const ProfileEditForm = ({ onClose }: ProfileEditFormProps) => {
  const { user } = useAuth();
  const { profile, isLoading, error, updateProfile, refreshProfile } = useProfile();
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // For cover image cropper
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  
  // Load profile data when component mounts
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setAvatarUrl(profile.avatar_url);
      setCoverUrl(profile.cover_url);
    }
  }, [profile]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Validate website format
      let formattedWebsite = website.trim();
      if (formattedWebsite && !formattedWebsite.match(/^https?:\/\//)) {
        formattedWebsite = 'https://' + formattedWebsite;
      }
      
      // Validate location length
      if (location.length > 30) {
        toast({
          title: 'Location too long',
          description: 'Location must be 30 characters or less.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      
      await updateProfile({
        username,
        display_name: displayName,
        bio,
        location,
        website: formattedWebsite,
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update the profile with the new avatar URL
      await updateProfile({ 
        avatar_url: urlData.publicUrl
      });
      
      // Update local state
      setAvatarUrl(urlData.publicUrl);
      
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleCoverImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setCoverImageFile(file);
    setIsCropperOpen(true);
  };
  
  const handleCroppedCoverImage = async (croppedImage: Blob) => {
    // The actual upload is now handled within the CoverImageCropper component
    // Here we just update our local state for UI updates
    if (coverUrl) {
      URL.revokeObjectURL(coverUrl);
    }
    
    // Create a URL for preview
    const localCoverUrl = URL.createObjectURL(croppedImage);
    setCoverUrl(localCoverUrl);
    
    // Refresh the profile to get the updated cover URL from the database
    await refreshProfile();
  };
  
  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    } else if (username) {
      return username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'UN';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading profile: {error}
      </div>
    );
  }
  
  return (
    <div>
      {/* Cover Image Section */}
      <div className="relative mb-16">
        <AspectRatio ratio={3/1} className="bg-gray-100 w-full">
          <div className="h-full w-full relative">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No cover image</p>
              </div>
            )}
            
            {/* Cover Image Upload Button */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
              <label className="cursor-pointer">
                <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-full flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  <span>Change cover</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCoverImageSelect}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </AspectRatio>
        
        {/* Avatar Section (positioned on top of cover) */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-white">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-twitter-blue text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* Avatar Upload Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer">
                <ImagePlus className="h-8 w-8 text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
              </label>
            </div>
            
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <Loader className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-8 px-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input 
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea 
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            className="min-h-[100px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" /> Location
          </Label>
          <Input 
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Malmö"
            maxLength={30}
          />
          <p className="text-xs text-gray-500">{location.length}/30 characters</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="website" className="flex items-center">
            <Link2 className="h-4 w-4 mr-1" /> Website
          </Label>
          <Input 
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g., https://www.google.com"
          />
          <p className="text-xs text-gray-500">Enter your website URL</p>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
      
      {/* Cover Image Cropper Modal */}
      <CoverImageCropper 
        imageFile={coverImageFile}
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onSave={handleCroppedCoverImage}
      />
    </div>
  );
};

export default ProfileEditForm;
