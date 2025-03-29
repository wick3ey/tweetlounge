
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
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
  }, [user, loading, navigate, location, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
