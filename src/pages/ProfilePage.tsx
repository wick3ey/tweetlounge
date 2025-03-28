
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileHeader from '@/components/profile/ProfileHeader';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile: currentUserProfile } = useProfile();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  
  // For this demo, if no username is provided, we show the current user's profile
  const isCurrentUser = !username || (currentUserProfile?.username === username);

  useEffect(() => {
    // For demonstration purposes, mock the profile data
    const setupProfileData = () => {
      if (isCurrentUser && currentUserProfile) {
        setProfileData({
          id: user?.id,
          username: currentUserProfile.username,
          display_name: currentUserProfile.display_name,
          avatar_url: currentUserProfile.avatar_url,
          bio: currentUserProfile.bio,
          followers_count: 124,
          following_count: 73,
          joined_date: user?.created_at || new Date().toISOString()
        });
        
        // Mock tweets for the user
        const mockTweets: TweetWithAuthor[] = [
          {
            id: '1',
            content: 'Just updated my profile! What do you think of my new bio? #ProfileMakeover',
            author_id: user?.id || '',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            likes_count: 15,
            retweets_count: 3,
            replies_count: 5,
            is_retweet: false,
            author: {
              id: user?.id || '',
              username: currentUserProfile.username || '',
              display_name: currentUserProfile.display_name || '',
              avatar_url: currentUserProfile.avatar_url || '',
            },
          },
          {
            id: '2',
            content: 'Working on my Twitter clone project! Making progress with React, TypeScript and Supabase.',
            author_id: user?.id || '',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            likes_count: 42,
            retweets_count: 8,
            replies_count: 12,
            is_retweet: false,
            author: {
              id: user?.id || '',
              username: currentUserProfile.username || '',
              display_name: currentUserProfile.display_name || '',
              avatar_url: currentUserProfile.avatar_url || '',
            },
          },
          {
            id: '3',
            content: 'Here\'s a sneak peek of what I\'m building! #webdev #coding',
            author_id: user?.id || '',
            created_at: new Date(Date.now() - 259200000).toISOString(),
            likes_count: 78,
            retweets_count: 25,
            replies_count: 18,
            is_retweet: false,
            image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
            author: {
              id: user?.id || '',
              username: currentUserProfile.username || '',
              display_name: currentUserProfile.display_name || '',
              avatar_url: currentUserProfile.avatar_url || '',
            },
          },
        ];
        
        setTweets(mockTweets);
        setLoading(false);
      } else if (username) {
        // Mock data for a different user (in a real app, fetch from DB)
        setProfileData({
          id: 'other-user-id',
          username: username,
          display_name: 'Sample User',
          avatar_url: null,
          bio: 'This is a sample profile for demonstration purposes.',
          followers_count: 231,
          following_count: 157,
          joined_date: '2022-01-15T00:00:00Z'
        });
        
        // Mock tweets for the other user
        const mockTweets: TweetWithAuthor[] = [
          {
            id: '101',
            content: 'Hello Twitter! This is my first tweet! #NewUser',
            author_id: 'other-user-id',
            created_at: new Date(Date.now() - 345600000).toISOString(),
            likes_count: 5,
            retweets_count: 0,
            replies_count: 2,
            is_retweet: false,
            author: {
              id: 'other-user-id',
              username: username,
              display_name: 'Sample User',
              avatar_url: '',
            },
          },
        ];
        
        setTweets(mockTweets);
        setLoading(false);
      }
    };
    
    setupProfileData();
  }, [username, user, currentUserProfile, isCurrentUser]);

  const handleEditProfile = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex bg-white">
      <LeftSidebar />
      
      <main className="flex-1 border-x border-gray-200 min-h-screen">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4">
          <h1 className="text-xl font-bold">{profileData.display_name}</h1>
          <p className="text-sm text-gray-500">{tweets.length} Tweets</p>
        </div>
        
        <ProfileHeader
          userId={profileData.id}
          username={profileData.username}
          displayName={profileData.display_name}
          avatarUrl={profileData.avatar_url}
          bio={profileData.bio}
          isCurrentUser={isCurrentUser}
          followersCount={profileData.followers_count}
          followingCount={profileData.following_count}
          joinedDate={profileData.joined_date}
          onEditProfile={handleEditProfile}
        />
        
        <Tabs defaultValue="tweets" className="w-full">
          <TabsList className="grid grid-cols-4 w-full rounded-none border-b">
            <TabsTrigger value="tweets">Tweets</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tweets" className="divide-y divide-gray-200">
            {tweets.length > 0 ? (
              tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-xl font-bold">No tweets yet</p>
                <p className="text-gray-500 mt-2">
                  When this user posts tweets, they'll show up here.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="replies">
            <div className="p-8 text-center">
              <p className="text-xl font-bold">No replies yet</p>
              <p className="text-gray-500 mt-2">
                When this user replies to tweets, they'll show up here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="media">
            <div className="p-8 text-center">
              <p className="text-xl font-bold">No media yet</p>
              <p className="text-gray-500 mt-2">
                When this user posts tweets with media, they'll show up here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="likes">
            <div className="p-8 text-center">
              <p className="text-xl font-bold">No likes yet</p>
              <p className="text-gray-500 mt-2">
                Tweets this user likes will show up here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <RightSidebar />
    </div>
  );
};

export default ProfilePage;
