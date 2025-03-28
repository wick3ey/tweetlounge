
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(previewUrl);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // In a real implementation, you would upload the avatar and cover files to storage
      // and update the profile with the resulting URLs
      
      await updateProfile({
        display_name: displayName,
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
        // You would add the cover_url here from the uploaded cover file
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
        <div className="h-32 bg-twitter-light rounded-lg flex items-center justify-center">
          <label htmlFor="cover-upload" className="cursor-pointer flex items-center gap-2 bg-black/50 text-white p-2 rounded-full">
            <ImageIcon className="h-5 w-5" />
            <span>Add cover photo</span>
          </label>
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setCoverFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>
      
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
