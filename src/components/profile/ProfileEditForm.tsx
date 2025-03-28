
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Loader, Image as ImageIcon, Camera } from "lucide-react";
import CoverImageCropper from "./CoverImageCropper";
import { supabase } from "@/integrations/supabase/client";

interface ProfileEditFormProps {
  onClose: () => void;
}

const ProfileEditForm = ({ onClose }: ProfileEditFormProps) => {
  const { user } = useAuth();
  const { profile, updateProfile, isLoading } = useProfile();
  
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverCropperOpen, setCoverCropperOpen] = useState(false);
  const [croppedCoverBlob, setCroppedCoverBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(previewUrl);
    }
  };
  
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCoverFile(e.target.files[0]);
      setCoverCropperOpen(true);
    }
  };
  
  const handleCroppedCover = (croppedBlob: Blob) => {
    // Store the cropped blob for later upload
    setCroppedCoverBlob(croppedBlob);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setCoverUrl(previewUrl);
  };
  
  const uploadFile = async (file: File | Blob, bucket: string, path: string, fileName?: string): Promise<string> => {
    const fileExt = fileName ? fileName.split('.').pop() : 'jpg';
    const finalFileName = fileName || `${user?.id}-${Date.now()}.${fileExt}`;
    const filePath = `${path}/${finalFileName}`;
    
    const { error, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });
      
    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Error uploading file: ${error.message}`);
    }
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return urlData.publicUrl;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let newAvatarUrl = avatarUrl;
      let newCoverUrl = coverUrl;
      
      // Upload avatar if changed
      if (avatarFile) {
        try {
          newAvatarUrl = await uploadFile(avatarFile, 'profiles', 'avatars');
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast({
            title: "Avatar upload failed",
            description: "There was an error uploading your avatar.",
            variant: "destructive",
          });
        }
      }
      
      // Upload cover if changed
      if (croppedCoverBlob) {
        try {
          const coverFileName = coverFile?.name || `cover-${Date.now()}.jpg`;
          newCoverUrl = await uploadFile(croppedCoverBlob, 'profiles', 'covers', coverFileName);
        } catch (error) {
          console.error('Error uploading cover:', error);
          toast({
            title: "Cover upload failed",
            description: "There was an error uploading your cover photo.",
            variant: "destructive",
          });
        }
      }
      
      await updateProfile({
        display_name: displayName,
        username: username,
        bio: bio,
        avatar_url: newAvatarUrl,
        cover_url: newCoverUrl,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cover Photo Upload */}
      <div className="relative">
        <div 
          className="h-32 bg-twitter-light rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: coverUrl ? `url(${coverUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <label 
            htmlFor="cover-upload" 
            className={`cursor-pointer flex items-center gap-2 ${coverUrl ? 'bg-black/50 hover:bg-black/60' : 'bg-black/30 hover:bg-black/40'} text-white p-2 rounded-full transition-colors`}
          >
            <ImageIcon className="h-5 w-5" />
            <span>{coverUrl ? 'Change cover photo' : 'Add cover photo'}</span>
          </label>
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />
        </div>
      </div>
      
      {/* Twitter-style Cover Image Cropper */}
      <CoverImageCropper
        imageFile={coverFile}
        isOpen={coverCropperOpen}
        onClose={() => setCoverCropperOpen(false)}
        onSave={handleCroppedCover}
      />
      
      {/* Avatar Upload */}
      <div className="flex justify-center -mt-12">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-white">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 bg-white p-2 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-100"
          >
            <Camera className="h-4 w-4" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={15}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
          />
          <p className="text-xs text-gray-500 text-right">{bio.length}/160</p>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
};

export default ProfileEditForm;
