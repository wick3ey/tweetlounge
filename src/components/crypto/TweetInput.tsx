
import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Image, Link2, Smile } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'

const TweetInput: React.FC = () => {
  const { profile } = useProfile();

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return 'TL';
    }
  };

  return (
    <div className="p-4 border border-gray-800 rounded-lg bg-black">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="mb-3">
            <textarea 
              className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-gray-500"
              placeholder="What's happening?"
              rows={2}
            />
          </div>
          
          <div className="flex justify-between items-center border-t border-gray-800 pt-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8">
                <Link2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-crypto-blue hover:bg-crypto-blue/10 rounded-full p-2 h-8 w-8">
                <Smile className="h-5 w-5" />
              </Button>
            </div>
            
            <Button className="bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full px-4">
              Tweet
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TweetInput
