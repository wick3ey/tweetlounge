
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdatePayload = Omit<Profile, 'id' | 'created_at'>;

const ProfileForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<ProfileUpdatePayload>({
    username: null,
    display_name: null,
    bio: null,
    avatar_url: null,
    updated_at: new Date().toISOString()
  });

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  const getProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      console.log("Fetching profile for user:", user.id);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        if (fetchError.code !== 'PGRST116') { // Not found error
          throw fetchError;
        }
        // If profile not found, create one
        await createDefaultProfile();
        return;
      }
      
      if (data) {
        console.log("Profile found:", data);
        setProfile({
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
          updated_at: new Date().toISOString()
        });
      } else {
        console.log('No profile found, creating default profile');
        await createDefaultProfile();
      }
    } catch (error) {
      console.error('Profile loading error:', error);
      setError('Error loading profile: ' + error.message);
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
    if (!user?.id) return;
    
    try {
      console.log('Creating default profile for user:', user.id);
      const newProfile = {
        username: user?.email?.split('@')[0] || null,
        display_name: user?.email?.split('@')[0] || null,
        bio: null,
        avatar_url: null,
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase.from('profiles').insert([{
        id: user.id,
        ...newProfile
      }]);

      if (insertError) {
        console.error('Error creating default profile:', insertError);
        throw insertError;
      }

      setProfile(newProfile);
      console.log('Default profile created successfully');
      setSuccess('Default profile created successfully');
    } catch (error) {
      console.error('Error creating default profile:', error);
      setError('Error creating profile: ' + error.message);
      toast({
        title: 'Error creating profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      console.log('Updating profile for user:', user.id);
      const updates = {
        ...profile,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Profile updated successfully');
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
      console.log('Profile updated successfully');
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
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setProfile(prev => ({
        ...prev,
        avatar_url: data.publicUrl
      }));
      
      setSuccess('Avatar updated successfully');
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
      
      console.log('Avatar updated successfully');
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        
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
