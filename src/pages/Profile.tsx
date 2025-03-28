
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, Settings, Image, Reply, Heart } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('posts');
  
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
    <div className="w-full">
      <ProfileHeader
        userId={user?.id || ''}
        username={profile.username || 'username'}
        displayName={profile.display_name || 'Display Name'}
        avatarUrl={profile.avatar_url || undefined}
        coverUrl={profile.cover_url || undefined}
        bio={profile.bio || undefined}
        location={profile.location || undefined}
        website={profile.website ? formatWebsiteUrl(profile.website) : undefined}
        ethereumAddress={profile.ethereum_address}
        solanaAddress={profile.solana_address}
        isCurrentUser={isCurrentUser}
        followersCount={0} // placeholder
        followingCount={0} // placeholder
        joinedDate={userCreatedAt || new Date().toISOString()}
        onEditProfile={handleEditProfile}
      />
      
      {/* Profile Tabs */}
      <div className="border-b border-gray-200">
        <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full flex justify-between bg-transparent border-b px-0">
            <TabsTrigger 
              value="posts" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-twitter-blue data-[state=active]:text-twitter-blue"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="replies" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-twitter-blue data-[state=active]:text-twitter-blue"
            >
              Replies
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-twitter-blue data-[state=active]:text-twitter-blue"
            >
              Media
            </TabsTrigger>
            <TabsTrigger 
              value="likes" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-twitter-blue data-[state=active]:text-twitter-blue"
            >
              Likes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {activeTab === 'posts' && (
                <>
                  <div className="text-xl font-bold mb-2">No posts yet</div>
                  <p className="text-gray-500 text-center mb-6">When you post, your tweets will show up here</p>
                  {isCurrentUser && (
                    <Button className="bg-twitter-blue hover:bg-twitter-blue/90 text-white rounded-full">
                      Create your first post
                    </Button>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="replies" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Reply className="h-12 w-12 text-gray-300 mb-4" />
              <div className="text-xl font-bold mb-2">No replies yet</div>
              <p className="text-gray-500 text-center">When you reply to someone, it will show up here</p>
            </div>
          </TabsContent>
          
          <TabsContent value="media" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Image className="h-12 w-12 text-gray-300 mb-4" />
              <div className="text-xl font-bold mb-2">No media yet</div>
              <p className="text-gray-500 text-center">When you post photos or videos, they will show up here</p>
            </div>
          </TabsContent>
          
          <TabsContent value="likes" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Heart className="h-12 w-12 text-gray-300 mb-4" />
              <div className="text-xl font-bold mb-2">No likes yet</div>
              <p className="text-gray-500 text-center">Tweets you like will show up here</p>
            </div>
          </TabsContent>
        </Tabs>
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
