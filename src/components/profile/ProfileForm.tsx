
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ProfileForm = () => {
  const { user } = useAuth();
  const { profile, isLoading, error: profileError, updateProfile } = useProfile();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [localProfile, setLocalProfile] = useState({
    username: '',
    display_name: '',
    bio: '',
  });

  // Update local form state when profile data loads
  useState(() => {
    if (profile) {
      setLocalProfile({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await updateProfile({
        username: localProfile.username || null,
        display_name: localProfile.display_name || null,
        bio: localProfile.bio || null
      });
      
      setSuccess('Profile updated successfully');
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile: ' + error.message);
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      console.log('Uploading avatar to storage:', filePath);
      
      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
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
      
      setSuccess('Avatar updated successfully');
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Error uploading avatar: ' + error.message);
      toast({
        title: 'Error uploading avatar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
        <CardDescription>Manage your account and profile information</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {profileError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Profile avatar" />
                ) : null}
                <AvatarFallback className="text-lg bg-twitter-blue text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="text-xs"
                >
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={localProfile.username}
                  onChange={(e) => setLocalProfile({ ...localProfile, username: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={localProfile.display_name}
                  onChange={(e) => setLocalProfile({ ...localProfile, display_name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={localProfile.bio}
              onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
              placeholder="Tell us about yourself"
              className="min-h-[120px]"
            />
          </div>
          
          <Button type="submit" className="btn-twitter" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileForm;
