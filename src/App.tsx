
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { initCacheCleanupService } from './utils/cacheCleanupService';
import { useEffect } from 'react';

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import ProfilePage from "./pages/ProfilePage";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
import Bookmarks from "./pages/Bookmarks";
import Market from "./pages/Market";
import TweetPage from "./pages/TweetPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import HashtagPage from "./pages/HashtagPage";

// Configure React Query client with optimized settings for real-time performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Only retry failed queries once
      staleTime: 15 * 1000, // Consider data fresh for 15 seconds
      gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
      networkMode: 'always', // Always attempt to fetch fresh data
    },
  },
});

const App = () => {
  // Initialize cache cleanup service when the app starts
  useEffect(() => {
    // Clean up expired cache entries every 15 minutes
    const cleanup = initCacheCleanupService(15 * 60 * 1000);
    
    // Trigger an initial fetch when the app loads
    const triggerInitialFetch = async () => {
      try {
        console.log('Triggering initial market data fetch');
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.functions.invoke('fetchCryptoData', {
          body: JSON.stringify({ cache_key: 'market_data_v1', trigger: 'initial' })
        });
        console.log('Initial market data fetch complete');
      } catch (error) {
        console.error('Failed to trigger initial data fetch:', error);
      }
    };
    
    triggerInitialFetch();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
        <AuthProvider>
          <ProfileProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <div className="bg-black min-h-screen">
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/notifications" element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    } />
                    <Route path="/bookmarks" element={
                      <ProtectedRoute>
                        <Bookmarks />
                      </ProtectedRoute>
                    } />
                    <Route path="/market" element={<Market />} />
                    <Route path="/tweet/:tweetId" element={<TweetPage />} />
                    <Route path="/hashtag/:name" element={<HashtagPage />} />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile/:username" element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </div>
            </TooltipProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
