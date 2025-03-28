
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const RightSidebar = () => {
  // Mock data
  const trends = [
    { id: 1, name: 'Sweden', count: '12.4K' },
    { id: 2, name: 'Programming', count: '53.7K' },
    { id: 3, name: 'React', count: '37.1K' },
    { id: 4, name: 'TypeScript', count: '19.8K' },
    { id: 5, name: 'Supabase', count: '8.2K' },
  ];
  
  const whoToFollow = [
    { id: 1, name: 'React', username: 'reactjs', avatar: 'https://avatars.githubusercontent.com/u/6412038?s=200&v=4' },
    { id: 2, name: 'TypeScript', username: 'typescript', avatar: 'https://avatars.githubusercontent.com/u/13409222?s=200&v=4' },
    { id: 3, name: 'Supabase', username: 'supabase', avatar: 'https://avatars.githubusercontent.com/u/54469796?s=200&v=4' },
  ];

  return (
    <div className="hidden lg:block w-80 p-4 sticky top-0 h-screen">
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input 
          className="pl-10 bg-gray-100 border-none rounded-full"
          placeholder="Search Twitter"
        />
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <h2 className="font-bold text-xl mb-4">What's happening</h2>
        <div className="space-y-4">
          {trends.map((trend) => (
            <div key={trend.id} className="cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
              <p className="text-sm text-gray-500">Trending</p>
              <p className="font-semibold">#{trend.name}</p>
              <p className="text-sm text-gray-500">{trend.count} Tweets</p>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="text-twitter-blue mt-3 w-full justify-start">
          Show more
        </Button>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4">
        <h2 className="font-bold text-xl mb-4">Who to follow</h2>
        <div className="space-y-4">
          {whoToFollow.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-gray-500">@{profile.username}</p>
                </div>
              </div>
              <Button className="bg-black hover:bg-black/80 text-white rounded-full">
                Follow
              </Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="text-twitter-blue mt-3 w-full justify-start">
          Show more
        </Button>
      </div>
    </div>
  );
};

export default RightSidebar;
