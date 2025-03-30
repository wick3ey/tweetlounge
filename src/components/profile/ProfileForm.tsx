import { useState, useEffect } from 'react';
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
import { Loader, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CryptoButton } from '@/components/ui/crypto-button';
import { ErrorDialog } from '@/components/ui/error-dialog';

const ProfileForm = () => {
  const { user } = useAuth();
  const { profile, isLoading, error: profileError, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'checking' | 'initial'>('initial');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  
  const [localProfile, setLocalProfile] = useState({
    username: '',
    display_name: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setLocalProfile({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username) {
      setUsernameStatus('initial');
      return;
    }

    if (profile?.username === username) {
      setUsernameStatus('available');
      return;
    }

    try {
      setIsCheckingUsername(true);
      setUsernameStatus('checking');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .maybeSingle();
      
      if (error) throw error;
      
      setUsernameStatus(data ? 'taken' : 'available');
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameStatus('initial');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localProfile.username) {
        checkUsernameAvailability(localProfile.username);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [localProfile.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (usernameStatus === 'taken') {
      setErrorDialogMessage('Username is already taken. Please choose another.');
      setShowErrorDialog(true);
      return;
    }
    
    if (usernameStatus === 'checking') {
      setErrorDialogMessage('Please wait while we check if the username is available.');
      setShowErrorDialog(true);
      return;
    }
    
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
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.message && error.message.includes('username is already taken')) {
        setErrorDialogMessage('This username is already taken by another user. Please choose a different username.');
        setShowErrorDialog(true);
      } else {
        setError('Error updating profile: ' + error.message);
      }
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
      
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
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
        <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
      </div>
    );
  }

  return (
    <Card className="w-full bg-crypto-darkgray border-crypto-gray text-crypto-text">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-crypto-text">Your Profile</CardTitle>
        <CardDescription className="text-crypto-lightgray">Manage your account and profile information</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-crypto-red/10 border-crypto-red">
            <AlertCircle className="h-4 w-4 text-crypto-red" />
            <AlertDescription className="text-crypto-red">{error}</AlertDescription>
          </Alert>
        )}
        
        {profileError && (
          <Alert variant="destructive" className="mb-4 bg-crypto-red/10 border-crypto-red">
            <AlertCircle className="h-4 w-4 text-crypto-red" />
            <AlertDescription className="text-crypto-red">{profileError}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="mb-4 bg-crypto-green/10 border-crypto-green">
            <CheckCircle className="h-4 w-4 text-crypto-green" />
            <AlertDescription className="text-crypto-green">{success}</AlertDescription>
          </Alert>
        )}
        
        <ErrorDialog 
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          title="Username Availability"
          description={errorDialogMessage}
          variant="info"
        />
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Profile avatar" />
                ) : null}
                <AvatarFallback className="text-lg bg-crypto-blue text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <CryptoButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="text-xs border-crypto-gray text-crypto-text hover:bg-crypto-gray/20"
                >
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </CryptoButton>
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
                <Label htmlFor="username" className="text-crypto-text">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={localProfile.username}
                    onChange={(e) => setLocalProfile({ ...localProfile, username: e.target.value })}
                    placeholder="@username"
                    className={`bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue pr-10 ${
                      usernameStatus === 'taken' ? 'border-crypto-red' : 
                      usernameStatus === 'available' && localProfile.username ? 'border-crypto-green' : ''
                    }`}
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader className="h-4 w-4 animate-spin text-crypto-blue" />
                    </div>
                  )}
                  {!isCheckingUsername && localProfile.username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === 'taken' ? (
                        <XCircle className="h-4 w-4 text-crypto-red" />
                      ) : usernameStatus === 'available' ? (
                        <CheckCircle className="h-4 w-4 text-crypto-green" />
                      ) : null}
                    </div>
                  )}
                </div>
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-crypto-red mt-1">This username is already taken</p>
                )}
                {usernameStatus === 'available' && localProfile.username && (
                  <p className="text-xs text-crypto-green mt-1">Username is available</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-crypto-text">Display Name</Label>
                <Input
                  id="displayName"
                  value={localProfile.display_name}
                  onChange={(e) => setLocalProfile({ ...localProfile, display_name: e.target.value })}
                  placeholder="Your display name"
                  className="bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-crypto-text">Bio</Label>
            <Textarea
              id="bio"
              value={localProfile.bio}
              onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
              placeholder="Tell us about yourself"
              className="min-h-[120px] bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
            />
          </div>
          
          <CryptoButton 
            type="submit" 
            disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </CryptoButton>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileForm;
