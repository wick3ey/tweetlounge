
import { Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    <div className="hidden lg:block w-72 p-2 sticky top-0 h-screen overflow-y-auto scrollbar-thin">
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input 
          className="pl-10 bg-card/50 border-border/50 rounded-full text-sm h-9"
          placeholder="Search KryptoSphere"
        />
      </div>
      
      <div className="glass-card p-3 mb-4">
        <div className="flex items-center mb-2">
          <TrendingUp className="h-4 w-4 text-primary mr-2" />
          <h2 className="font-display font-semibold text-base">Trending</h2>
        </div>
        <div className="space-y-2">
          {trends.map((trend) => (
            <div key={trend.id} className="cursor-pointer hover:bg-primary/5 p-2 rounded-lg transition-colors">
              <p className="text-xs text-muted-foreground">Trending</p>
              <p className="font-medium text-foreground hover-underline inline-block text-sm">#{trend.name}</p>
              <p className="text-xs text-muted-foreground">{trend.count} Tweets</p>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 mt-2 w-full justify-start text-sm">
          Show more
        </Button>
      </div>
      
      <div className="glass-card p-3">
        <h2 className="font-display font-semibold text-base mb-3">Who to follow</h2>
        <div className="space-y-3">
          {whoToFollow.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between group">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 border border-border/50 group-hover:border-primary/20 transition-all">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="ml-2">
                  <p className="font-medium text-foreground text-sm">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <Button 
                className="text-white bg-card hover:bg-card/80 rounded-full text-xs py-1 px-2 h-7 border border-primary/50 hover:border-primary transition-colors"
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 mt-2 w-full justify-start text-sm">
          Show more
        </Button>
      </div>
    </div>
  );
};

export default RightSidebar;
