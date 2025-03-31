
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Only redirect if the auth state has finished loading and there's no user or session
    if (!loading && !user && !session) {
      console.log('Not authenticated, redirecting to login', { user, session, loading });
      toast({
        title: "Authentication Required",
        description: "You must be logged in to access this page",
        variant: "destructive"
      });
      
      // Redirect to login and remember where the user was trying to go
      navigate('/login', { 
        state: { from: location.pathname } 
      });
    }
  }, [user, session, loading, navigate, location, toast]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  // Only render children if user is authenticated
  return (user || session) ? <>{children}</> : null;
};

export default ProtectedRoute;
