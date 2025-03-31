
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoButton } from "@/components/ui/crypto-button";
import { Users, ChevronDown } from 'lucide-react';

// Mock data for Who to Follow section
const suggestedUsers = [
  {
    id: 1,
    username: 'j9842183',
    displayName: 'j',
    verified: true,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=j'
  },
  {
    id: 2,
    username: 'snow',
    displayName: 'snow',
    verified: true,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=snow'
  },
  {
    id: 3,
    username: 'jonas',
    displayName: 'jonas',
    verified: true,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=jonas'
  }
];

const WhoToFollowCard = () => (
  <Card className="border-crypto-gray/30 shadow-md bg-black">
    <CardHeader className="pb-2 border-b border-crypto-gray/30">
      <CardTitle className="text-base font-display flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-crypto-blue/20 flex items-center justify-center">
          <Users className="h-3 w-3 text-crypto-blue" />
        </div>
        Who to follow
      </CardTitle>
    </CardHeader>
    
    <CardContent className="p-0">
      <div className="space-y-1 py-1">
        {suggestedUsers.map(user => (
          <div key={user.id} className="py-2 px-4 hover:bg-crypto-gray/10 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-crypto-gray/20">
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              </div>
              
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm">{user.displayName}</span>
                  {user.verified && (
                    <span className="text-crypto-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53-1.471-1.47a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="text-xs text-crypto-lightgray">@{user.username}</div>
              </div>
            </div>
            
            <CryptoButton size="sm" className="h-8 px-3 bg-white hover:bg-white/90 text-black">
              Follow
            </CryptoButton>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-crypto-gray/30">
        <CryptoButton variant="ghost" size="sm" className="w-full hover:bg-crypto-gray/10">
          Show more <ChevronDown className="ml-1 h-4 w-4" />
        </CryptoButton>
      </div>
    </CardContent>
  </Card>
);

const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-72 xl:w-80 h-full overflow-y-auto sticky top-0 p-4 space-y-4">
      <MarketStats />
      
      <Card className="border-crypto-gray/30 shadow-md bg-black">
        <CardHeader className="pb-2 border-b border-crypto-gray/30">
          <CardTitle className="text-base font-display">What's happening</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <TrendingHashtags limit={5} />
          <CryptoButton variant="ghost" size="sm" className="w-full mt-2 hover:bg-crypto-gray/10">
            Show more <ChevronDown className="ml-1 h-4 w-4" />
          </CryptoButton>
        </CardContent>
      </Card>
      
      <WhoToFollowCard />
      
      <NewsSection compact={true} />
    </aside>
  );
};

export default RightSidebar;
