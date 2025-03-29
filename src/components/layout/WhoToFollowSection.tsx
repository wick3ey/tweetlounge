
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from 'lucide-react';

interface SuggestedUser {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

export const WhoToFollowSection: React.FC = () => {
  const suggestedUsers: SuggestedUser[] = [
    { 
      id: 1, 
      name: 'Vitalik Buterin', 
      username: 'vitalikbuterin', 
      avatar: 'https://pbs.twimg.com/profile_images/977496875887558661/L86xyLF4_400x400.jpg' 
    },
    { 
      id: 2, 
      name: 'CZ Binance', 
      username: 'cz_binance', 
      avatar: 'https://pbs.twimg.com/profile_images/1690836282220613638/rW36MAxf_400x400.jpg' 
    },
    { 
      id: 3, 
      name: 'Brian Armstrong', 
      username: 'brian_armstrong', 
      avatar: 'https://pbs.twimg.com/profile_images/1347260911376510977/3MPJ6Fu__400x400.jpg' 
    },
  ];

  return (
    <Card className="bg-black border-gray-800">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Users className="w-5 h-5 text-crypto-blue mr-2" />
          Who to Follow
        </h3>
        <div className="space-y-4">
          {suggestedUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3 border border-gray-800">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-gray-500 text-xs">@{user.username}</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-white text-black hover:bg-gray-200 rounded-full text-xs h-8"
              >
                Follow
              </Button>
            </div>
          ))}
          <Button variant="ghost" className="text-crypto-blue px-0 mt-2 text-sm w-full hover:bg-crypto-blue/10">
            Show more
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
