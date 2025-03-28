
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import TweetCard from "@/components/tweet/TweetCard";
import { TweetWithAuthor } from "@/types/Tweet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Link2, Pencil, ArrowLeft, Loader } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { format, parseISO } from "date-fns";

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const [profileTweets, setProfileTweets] = useState<TweetWithAuthor[]>([]);
  const [isProfileOwner, setIsProfileOwner] = useState(false);
  const [activeTab, setActiveTab] = useState("tweets");
  const [followers, setFollowers] = useState(154); // Mock data
  const [following, setFollowing] = useState(89); // Mock data
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    // Determine if current user is profile owner
    if (user && profile) {
      setIsProfileOwner(username === profile.username || !username);
    }

    // Mock data for demonstration
    const mockTweets: TweetWithAuthor[] = [
      {
        id: "1",
        content: "Just updated my profile on this amazing Twitter clone!",
        author_id: "1",
        created_at: new Date().toISOString(),
        likes_count: 7,
        retweets_count: 2,
        replies_count: 1,
        is_retweet: false,
        author: {
          id: "1",
          username: profile?.username || "user",
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url || "https://i.pravatar.cc/150?img=1"
        }
      },
      {
        id: "2",
        content: "Working on some exciting new features for my projects!",
        author_id: "1",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        likes_count: 12,
        retweets_count: 4,
        replies_count: 3,
        is_retweet: false,
        author: {
          id: "1",
          username: profile?.username || "user",
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url || "https://i.pravatar.cc/150?img=1"
        }
      }
    ];

    // Simulating API call to fetch tweets
    setTimeout(() => {
      setProfileTweets(mockTweets);
    }, 1000);
  }, [user, profile, username]);

  // Function to format a URL to a display-friendly version
  const formatWebsiteUrl = (url: string) => {
    if (!url) return "";
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch (error) {
      return url;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto flex">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Main Content */}
          <main className="flex-1 min-h-screen border-x border-gray-200">
            {/* Profile Header */}
            <div className="sticky top-0 z-10 bg-white backdrop-blur-sm bg-opacity-70 p-4 border-b border-gray-200 flex items-center gap-6">
              <Button 
                onClick={() => navigate(-1)}
                variant="ghost" 
                size="icon" 
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{profile?.display_name || "User"}</h1>
                <p className="text-sm text-gray-500">{profileTweets.length} Tweets</p>
              </div>
            </div>

            {/* Cover Photo with AspectRatio */}
            <AspectRatio ratio={3/1} className="bg-twitter-light">
              <div 
                className="h-full w-full relative"
                style={{
                  backgroundImage: profile?.cover_url ? `url(${profile.cover_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Profile Image */}
                <div className="absolute -bottom-16 left-4">
                  <Avatar className="h-32 w-32 border-4 border-white">
                    <AvatarImage src={profile?.avatar_url || "https://i.pravatar.cc/150?img=1"} />
                    <AvatarFallback>{profile?.display_name?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Edit Profile Button (only if it's the user's profile) */}
                {isProfileOwner && (
                  <div className="absolute top-4 right-4">
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="rounded-full bg-white bg-opacity-80 hover:bg-opacity-100"
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit profile</DialogTitle>
                        </DialogHeader>
                        <ProfileEditForm onClose={() => setIsEditOpen(false)} />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </AspectRatio>

            {/* Profile Info */}
            <div className="mt-16 px-4 py-3">
              <div className="mb-4">
                <h2 className="text-xl font-bold">{profile?.display_name || "User"}</h2>
                <p className="text-gray-500">@{profile?.username || "username"}</p>
              </div>
              
              {profile?.bio && (
                <p className="mb-3">{profile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-x-4 text-gray-500 text-sm mb-3">
                {profile?.location && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" /> {profile.location}
                  </span>
                )}
                
                {profile?.website && (
                  <span className="flex items-center">
                    <Link2 className="h-4 w-4 mr-1" /> 
                    <a 
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-twitter-blue hover:underline"
                    >
                      {formatWebsiteUrl(profile.website)}
                    </a>
                  </span>
                )}
                
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" /> 
                  {user?.created_at 
                    ? `Joined ${format(parseISO(user.created_at), 'MMMM yyyy')}`
                    : "Joined recently"}
                </span>
              </div>
              
              <div className="flex gap-4 text-sm mb-4">
                <a href="#" className="hover:underline">
                  <span className="font-bold">{following}</span>
                  <span className="text-gray-500"> Following</span>
                </a>
                <a href="#" className="hover:underline">
                  <span className="font-bold">{followers}</span>
                  <span className="text-gray-500"> Followers</span>
                </a>
              </div>
            </div>
            
            {/* Tweets Tabs */}
            <Tabs defaultValue="tweets" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="tweets">Tweets</TabsTrigger>
                <TabsTrigger value="replies">Replies</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="likes">Likes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tweets" className="divide-y divide-gray-200">
                {profileTweets.length > 0 ? (
                  profileTweets.map((tweet) => (
                    <TweetCard key={tweet.id} tweet={tweet} />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-medium">No tweets yet</p>
                    <p className="text-sm">When this user posts tweets, they'll show up here.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="replies">
                <div className="p-8 text-center text-gray-500">
                  <p className="text-lg font-medium">No replies yet</p>
                  <p className="text-sm">When this user replies to tweets, they'll show up here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="media">
                <div className="p-8 text-center text-gray-500">
                  <p className="text-lg font-medium">No media yet</p>
                  <p className="text-sm">When this user posts tweets with media, they'll show up here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="likes">
                <div className="p-8 text-center text-gray-500">
                  <p className="text-lg font-medium">No likes yet</p>
                  <p className="text-sm">When this user likes tweets, they'll show up here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </main>

          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
