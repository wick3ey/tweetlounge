
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const SignupForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'checking' | 'initial'>('initial');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Check if username is available
  const checkUsernameAvailability = async (username: string) => {
    if (!username) {
      setUsernameStatus('initial');
      return;
    }

    try {
      setIsCheckingUsername(true);
      setUsernameStatus('checking');
      
      // Look for other profiles with this username
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (error) throw error;
      
      // If data exists, username is taken
      setUsernameStatus(data ? 'taken' : 'available');
    } catch (err) {
      console.error('Error checking username:', err);
      // Set status back to initial on error
      setUsernameStatus('initial');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounce the username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [username]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    // Prevent submission if username is taken
    if (usernameStatus === 'taken') {
      setErrorMessage('Username is already taken. Please choose another.');
      setIsLoading(false);
      return;
    }
    
    // Prevent submission while checking username
    if (usernameStatus === 'checking') {
      setErrorMessage('Please wait while we check if the username is available.');
      setIsLoading(false);
      return;
    }
    
    // Check if username is valid
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorMessage('Username can only contain letters, numbers, and underscores.');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create user account
      const { error } = await signUp(email, password, { username });
      
      if (error) {
        console.error('Signup error:', error);
        setErrorMessage(error.message || 'An error occurred during signup');
      } else {
        // Show success message since email verification might be required
        setErrorMessage('Signup successful! Please check your email for verification instructions.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle the constraint violation error specifically
      if (error.message && error.message.includes('profiles_username_unique')) {
        setErrorMessage('This username is already taken by another user. Please choose a different username.');
      } else {
        setErrorMessage(error.message || 'An error occurred during signup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    const { error } = await signInWithGoogle();
    
    if (error) {
      console.error('Google login error:', error);
      setErrorMessage(error.message || 'An error occurred with Google login');
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Enter your details to create your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant={errorMessage.includes('successful') ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 py-5 border-2"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
              fill="currentColor"
            />
          </svg>
          Continue with Google
        </Button>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${
                  usernameStatus === 'taken' ? 'border-red-500' : 
                  usernameStatus === 'available' && username ? 'border-green-500' : ''
                } pr-10`}
              />
              {isCheckingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!isCheckingUsername && username && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'taken' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : usernameStatus === 'available' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {usernameStatus === 'taken' && (
              <p className="text-xs text-red-500 mt-1">This username is already taken</p>
            )}
            {usernameStatus === 'available' && username && (
              <p className="text-xs text-green-500 mt-1">Username is available</p>
            )}
            <p className="text-xs text-gray-500">Username can only contain letters, numbers, and underscores</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500">Must be at least 6 characters</p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-twitter" 
            disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
          >
            {isLoading ? 'Creating Account...' : 'Create Account with Email'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={() => navigate('/login')}>
          Already have an account? Sign in
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SignupForm;
