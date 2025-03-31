
import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the path the user was trying to access before being redirected to login
  const from = location.state?.from || '/home';

  useEffect(() => {
    if (!loading && (user || session)) {
      // If user is already logged in, redirect them to the home page or the page they were trying to access
      console.log('User is logged in, redirecting to:', from);
      toast({
        title: 'Already logged in',
        description: 'You are already logged in.',
      });
      navigate(from);
    }
  }, [user, session, loading, navigate, from, toast]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Helmet>
        <title>Login | CryptoTwitter</title>
      </Helmet>
      
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="space-y-6">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold crypto-gradient-text">Sign in to your account</h2>
              <p className="mt-2 text-sm text-gray-400">
                Or{' '}
                <Link to="/signup" className="font-medium text-crypto-blue hover:text-crypto-blue/80">
                  create a new account
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
              <h2 className="text-4xl font-bold mb-4">Join the Crypto Twitter Community</h2>
              <p className="text-xl">
                Connect with crypto enthusiasts, share your insights, and stay updated on the latest market trends.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
