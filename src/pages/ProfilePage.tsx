
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
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-web3-darker">
        <div className="glass-card p-8 flex flex-col items-center">
          <Loader className="h-10 w-10 animate-spin text-web3-primary" />
          <p className="mt-4 text-web3-primary dark:text-white/80 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-web3-darker">
        <div className="glass-card p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 gradient-text">User not found</h1>
          <p className="text-gray-500 dark:text-gray-400">The user you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-background dark:bg-gradient-to-b dark:from-web3-dark dark:to-web3-darker transition-colors duration-300">
        <Navbar />
        <div className="container mx-auto flex flex-col lg:flex-row">
          <LeftSidebar />
          <main className="flex-1 min-h-screen border-x border-border">
            <Profile />
          </main>
          <RightSidebar />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ProfilePage;
