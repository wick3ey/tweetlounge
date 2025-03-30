import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { 
  Home, 
  Bell, 
  Bookmark, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CryptoButton } from '@/components/ui/crypto-button';
import { useToast } from '@/components/ui/use-toast';

const LeftSidebar = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/login');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinkClass = (isActive: boolean) => {
    return `flex items-center space-x-3 px-4 py-3 rounded-full transition-colors ${
      isActive 
        ? 'bg-crypto-blue/10 text-crypto-blue font-medium' 
        : 'text-crypto-text hover:bg-crypto-gray/10'
    }`;
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return 'UN';
  };

  return (
    <aside className="w-[250px] hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
      <div className="flex flex-col h-full justify-between">
        <div>
          <nav className="space-y-2">
            <NavLink 
              to="/home" 
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </NavLink>
            
            {user ? (
              <>
                <NavLink 
                  to="/notifications" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </NavLink>
                
                <NavLink 
                  to="/messages" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Messages</span>
                </NavLink>
                
                <NavLink 
                  to="/bookmarks" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Bookmark className="h-5 w-5" />
                  <span>Bookmarks</span>
                </NavLink>
                
                <NavLink 
                  to="/profile" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </NavLink>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-crypto-text hover:bg-crypto-gray/10 px-4 py-3 rounded-full"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                </Button>
              </>
            ) : (
              <>
                <NavLink 
                  to="/login" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign in</span>
                </NavLink>
                
                <NavLink 
                  to="/signup" 
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Sign up</span>
                </NavLink>
              </>
            )}
          </nav>
          
          <div className="mt-6">
            <CryptoButton 
              className="w-full bg-crypto-blue hover:bg-crypto-darkblue text-white"
              onClick={() => navigate('/market')}
            >
              Explore Market
            </CryptoButton>
          </div>
        </div>
        
        {user && profile && (
          <div className="mt-auto pt-4 border-t border-crypto-gray/30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between p-2 hover:bg-crypto-gray/10 rounded-lg">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      {profile.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-crypto-blue/30 to-purple-500/30">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm text-crypto-text">{profile.display_name || 'User'}</p>
                      <p className="text-xs text-crypto-lightgray">@{profile.username || 'username'}</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] bg-crypto-darkgray border-crypto-gray">
                <DropdownMenuLabel className="text-crypto-lightgray">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-crypto-gray/30" />
                <DropdownMenuItem 
                  className="text-crypto-text hover:bg-crypto-gray/20 cursor-pointer"
                  onClick={() => navigate('/profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-crypto-text hover:bg-crypto-gray/20 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
