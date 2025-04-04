
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

const queryClient = new QueryClient();

const App = () => {
  // Initialize cache cleanup service when the app starts
  useEffect(() => {
    // Clean up expired cache entries every 30 minutes
    const cleanup = initCacheCleanupService(30 * 60 * 1000);
    
    // Trigger an initial fetch when the app loads
    const triggerInitialFetch = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.functions.invoke('fetchCryptoData', {
          body: { trigger: 'initial' }
        });
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
            </TooltipProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
