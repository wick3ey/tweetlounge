
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Check, Zap, Settings } from 'lucide-react';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'U';
    }
  };

  const goToProfile = () => {
    if (profile?.username) {
      navigate(`/profile/${profile.username}`);
    } else {
      navigate('/profile');
    }
  };

  // Check if the user has a verified NFT profile picture
  const isNFTVerified = profile?.avatar_nft_id && profile?.avatar_nft_chain;

  return (
    <nav className="border-b border-border/30 backdrop-blur-sm bg-background/40 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/home" className="text-xl font-display font-bold text-primary flex items-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-2">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="bg-web3-gradient bg-clip-text text-transparent">TweetLounge</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-primary/5 hover:bg-primary/10 hover-glow">
                  <Avatar className="h-9 w-9 border border-border/50">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="User" />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-card border-border/50 backdrop-blur-md w-60" align="end">
                <div className="flex items-center p-3 border-b border-border/30">
                  <Avatar className="h-9 w-9 mr-3 border border-border/50">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="User" />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary font-medium text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="font-medium">{profile?.display_name || user.email?.split('@')[0]}</span>
                      
                      {/* Modern Twitter-style Verified Badge */}
                      {isNFTVerified && (
                        <div className="inline-flex items-center ml-1">
                          <div className="bg-primary rounded-full p-0.5 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">@{profile?.username || user.email?.split('@')[0]}</span>
                  </div>
                </div>
                <DropdownMenuItem className="focus:bg-primary/10 cursor-pointer" onClick={goToProfile}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-primary/10 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem className="focus:bg-primary/10 cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="border-primary/30 text-foreground hover:bg-primary/10"
              >
                Sign In
              </Button>
              <Button 
                className="web3-button shadow-glow-sm hover:shadow-glow-md" 
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
