
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Mail, MapPin, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Profile } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { followUser, unfollowUser } from '@/services/profileService';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { createOrGetConversation } from '@/services/messageService';

interface ProfileHeaderProps {
  profile: Profile;
  isCurrentUser: boolean;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  className?: string;
}

const ProfileHeader = ({ profile, isCurrentUser, isFollowing, onFollowChange, className }: ProfileHeaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();
  
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  
  const handleFollowClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsLoadingFollow(true);
    
    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
        onFollowChange(false);
      } else {
        await followUser(profile.id);
        onFollowChange(true);
      }
      refreshProfile();
    } catch (error) {
      console.error('Error toggling follow status:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFollow(false);
    }
  };
  
  const handleEditProfile = () => {
    navigate('/profile');
  };
  
  const handleMessageClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (isCurrentUser) {
      return;
    }
    
    setIsLoadingMessage(true);
    
    try {
      const conversationId = await createOrGetConversation(profile.id);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessage(false);
    }
  };
  
  return (
    <div className={cn("pb-4", className)}>
      {/* Cover image */}
      <div className="h-40 bg-gray-900 relative">
        {profile.cover_url && (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-4">
        <div className="flex justify-between">
          <div className="mt-[-3rem]">
            <Avatar className="h-24 w-24 border-4 border-black bg-black">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || undefined} />
              <AvatarFallback className="text-xl">
                {profile.display_name?.[0] || profile.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="mt-4 flex gap-2">
            {isCurrentUser ? (
              <Button 
                variant="outline" 
                onClick={handleEditProfile}
              >
                Edit profile
              </Button>
            ) : (
              <>
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollowClick}
                  disabled={isLoadingFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMessageClick}
                  disabled={isLoadingMessage}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <h1 className="text-xl font-bold">
            {profile.display_name || profile.username || 'Anonymous'}
          </h1>
          <p className="text-crypto-lightgray">@{profile.username}</p>
          
          {profile.bio && (
            <p className="mt-2 text-crypto-text">{profile.bio}</p>
          )}
          
          <div className="flex flex-wrap gap-x-4 mt-3 text-sm text-crypto-lightgray">
            {profile.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{profile.location}</span>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-crypto-blue hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-1" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          
          <div className="flex gap-4 mt-3">
            <div>
              <span className="font-bold">{profile.following_count}</span>
              <span className="text-crypto-lightgray ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold">{profile.followers_count}</span>
              <span className="text-crypto-lightgray ml-1">Followers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
