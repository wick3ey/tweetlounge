
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Profile from "./Profile";
import { Loader } from "lucide-react";

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
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
        setProfileExists(false);
        setIsLoading(false);
        return;
      }

      // If viewing your own profile with username, continue normally
      try {
        // In a real implementation, this would check if the username exists in the database
        // For now, we're assuming all usernames exist
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <p className="text-gray-500">The user you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return <Profile />;
};

export default ProfilePage;
