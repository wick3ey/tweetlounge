
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type Profile, type ProfileUpdatePayload } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';

const ProfileForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [profile, setProfile] = useState<ProfileUpdatePayload>({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  const getProfile = async () => {
    try {
      setLoading(true);
      
      // Check if profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setProfile({
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
        });
      } else {
        // Create a default profile if one doesn't exist
        await createDefaultProfile();
      }
    } catch (error) {
      toast({
        title: 'Error loading profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    const newProfile = {
      id: user?.id,
      username: user?.email?.split('@')[0] || '',
      display_name: user?.email?.split('@')[0] || '',
      bio: '',
      avatar_url: '',
    };

    const { error } = await supabase.from('profiles').insert([newProfile]);

    if (!error) {
      setProfile({
        username: newProfile.username,
        display_name: newProfile.display_name,
        bio: newProfile.bio,
        avatar_url: newProfile.avatar_url,
      });
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      const updates = {
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
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
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;
      
      // Upload the image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // Update the profile state
      setProfile(prev => ({
        ...prev,
        avatar_url: data.publicUrl,
      }));
      
      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
    } catch (error) {
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
    if (profile.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  if (loading) {
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
        <form onSubmit={updateProfile} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} />
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
                  value={profile.username || ''}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
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
