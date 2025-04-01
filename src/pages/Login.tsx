
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Get the path the user was trying to access before being redirected to login
  const from = location.state?.from || '/home';

  useEffect(() => {
    // Use a small delay to ensure the auth state is properly processed
    const timer = setTimeout(() => {
      if (!loading) {
        setCheckingAuth(false);
        console.log('Login page - Auth check completed, user:', user ? 'authenticated' : 'not authenticated');
        
        if (user) {
          console.log('User authenticated, redirecting to:', from);
          toast({
            title: 'Redan inloggad',
            description: 'Du är redan inloggad.',
          });
          navigate(from);
        }
      }
    }, 500); // Short delay to ensure auth state is properly processed

    return () => clearTimeout(timer);
  }, [user, loading, navigate, from, toast]);

  if (loading || checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-10 w-10 animate-spin text-crypto-blue" />
          <p>Kontrollerar inloggningsstatus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Helmet>
        <title>Login | CryptoTwitter</title>
      </Helmet>
      
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="space-y-6">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold crypto-gradient-text">Logga in på ditt konto</h2>
              <p className="mt-2 text-sm text-gray-400">
                Eller{' '}
                <Link to="/signup" className="font-medium text-crypto-blue hover:text-crypto-blue/80">
                  skapa ett nytt konto
                </Link>
              </p>
            </div>
            
            <LoginForm />
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full object-cover bg-gradient-to-br from-crypto-blue via-purple-900 to-black">
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 max-w-lg">
              <h2 className="text-4xl font-bold mb-4">Gå med i Crypto Twitter-communityn</h2>
              <p className="text-xl">
                Kommunicera med kryptoentusiaster, dela dina insikter och håll dig uppdaterad om de senaste marknadstrenderna.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
