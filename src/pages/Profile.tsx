import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading, error } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const { username } = useParams<{ username: string }>();
  
  // This checks if we're viewing the current user's profile
  const isCurrentUser = !username || (profile?.username === username);
  
  // Fetch user creation date for accurate join date
  useEffect(() => {
    const fetchUserCreationDate = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user creation date:", error);
            return;
          }
          
          if (data) {
            setUserCreatedAt(data.created_at);
          }
        } catch (error) {
          console.error("Error in fetchUserCreationDate:", error);
        }
      }
    };
    
    fetchUserCreationDate();
  }, [user]);
  
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  const handleCloseEditForm = () => {
    setIsEditing(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="h-12 w-12 animate-spin text-twitter-blue" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">Error loading profile: {error}</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-gray-500 mb-4">Profile not found or you're not logged in.</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  // Process website URL to ensure it has proper format
  const formatWebsiteUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    return url.startsWith('http') ? url : `https://${url}`;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <ProfileHeader
        userId={user?.id || ''}
        username={profile.username || 'username'}
        displayName={profile.display_name || 'Display Name'}
        avatarUrl={profile.avatar_url || undefined}
        coverUrl={profile.cover_url || undefined}
        bio={profile.bio || undefined}
        location={profile.location || undefined}
        website={profile.website ? formatWebsiteUrl(profile.website) : undefined}
        isCurrentUser={isCurrentUser}
        followersCount={0} // placeholder
        followingCount={0} // placeholder
        joinedDate={userCreatedAt || new Date().toISOString()}
        onEditProfile={handleEditProfile}
      />
      
      {/* Profile content would go here */}
      <div className="p-4">
        {/* Tweets or other content would be rendered here */}
      </div>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <ProfileEditForm onClose={handleCloseEditForm} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
