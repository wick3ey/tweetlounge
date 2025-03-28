
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
import { ThemeProvider } from "@/components/ui/theme-provider";

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(true);

  useEffect(() => {
    const checkProfileExists = async () => {
      if (!username) {
        if (profile?.username) {
          // Redirect to the user's own profile if no username provided
          navigate(`/profile/${profile.username}`, { replace: true });
          return;
        }
        // If we don't have a username in the URL or in the profile, show the user's profile anyway
        setProfileExists(true);
        setIsLoading(false);
        return;
      }

      // If viewing own profile (with username), just continue
      try {
        // In a real implementation, we would check if username exists in database
        // For now, we assume all usernames exist
        setProfileExists(true);
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
          <Profile />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
};

export default ProfilePage;
