
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-twitter-extraExtraLight">
      <Navbar />
      
      <div className="page-container">
        <div className="flex flex-col md:flex-row items-center justify-between py-12 md:py-24 gap-8">
          <div className="flex-1 max-w-xl text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Welcome to <span className="text-twitter-blue">TweetLounge</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              Your new favorite place to connect, share, and discover what's happening in the world right now.
            </p>
            
            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="btn-twitter text-lg py-6 px-8" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
                <Button variant="outline" className="text-lg py-6 px-8" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </div>
            ) : (
              <Button className="btn-twitter text-lg py-6 px-8" onClick={() => navigate('/profile')}>
                View Your Profile
              </Button>
            )}
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md">
              <svg 
                viewBox="0 0 24 24" 
                className="h-64 w-64 text-twitter-blue fill-current opacity-20"
                aria-hidden="true"
              >
                <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="py-12 md:py-24">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Join TweetLounge?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-twitter p-6">
              <h3 className="text-xl font-bold mb-3">Connect</h3>
              <p className="text-gray-600">Follow your friends, favorite celebrities, and influential people. Build your network.</p>
            </div>
            
            <div className="card-twitter p-6">
              <h3 className="text-xl font-bold mb-3">Share</h3>
              <p className="text-gray-600">Share your thoughts, experiences, and moments with a community that cares.</p>
            </div>
            
            <div className="card-twitter p-6">
              <h3 className="text-xl font-bold mb-3">Discover</h3>
              <p className="text-gray-600">Stay informed with the latest news, trends, and conversations happening around the world.</p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">© {new Date().getFullYear()} TweetLounge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
