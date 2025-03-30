import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/components/ui/use-toast";
import Profile from "./Profile";
import { Loader } from "lucide-react";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import Navbar from "@/components/layout/Navbar";
import { getProfileByUsername } from "@/services/profileService";
import { supabase } from "@/lib/supabase";

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(true);
  const [viewingOwnProfile, setViewingOwnProfile] = useState(true);

  // Force profile refetch when navigating between profiles
  useEffect(() => {
    if (username && profile?.username !== username) {
      refreshProfile?.();
    }
  }, [username, profile?.username, refreshProfile]);

  useEffect(() => {
    const checkProfileExists = async () => {
      if (!username) {
        if (profile?.username) {
          navigate(`/profile/${profile.username}`, { replace: true });
          return;
        }
        setViewingOwnProfile(true);
        setProfileExists(true);
        setIsLoading(false);
        return;
      }

      if (profile?.username === username) {
        setViewingOwnProfile(true);
        setProfileExists(true);
        setIsLoading(false);
        return;
      }

      try {
        const profileData = await getProfileByUsername(username);
        if (profileData) {
          setProfileExists(true);
          setViewingOwnProfile(false);
        } else {
          setProfileExists(false);
          toast({
            title: "Error",
            description: "Could not find user profile",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        toast({
          title: "Error",
          description: "Could not find user profile",
          variant: "destructive",
        });
        setProfileExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfileExists();
  }, [username, profile, navigate, toast]);

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-crypto-black flex items-center justify-center">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl flex flex-col items-center">
          <Loader className="h-10 w-10 animate-spin text-crypto-blue mb-4" />
          <p className="text-crypto-blue animate-pulse font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="min-h-screen bg-crypto-black flex flex-col items-center justify-center px-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-crypto-blue font-display">User not found</h1>
          <p className="text-crypto-lightgray mb-6">The user you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/home')}
            className="bg-crypto-blue hover:bg-crypto-darkblue text-white px-4 py-2 rounded-lg"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-crypto-black">
      <Navbar />
      <div className="container mx-auto flex flex-col lg:flex-row">
        <LeftSidebar />
        <main className="flex-1 min-h-screen border-x border-crypto-gray/30">
          <Profile username={username} isOwnProfile={viewingOwnProfile} />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
};

export default ProfilePage;
