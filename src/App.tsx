
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { useEffect } from "react";
import { fetchHotPools, fetchRecentTokens } from "@/services/marketService";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import ProfilePage from "./pages/ProfilePage";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
import Bookmarks from "./pages/Bookmarks";
import NotFound from "./pages/NotFound";
import MarketWatcher from "./pages/MarketWatcher";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Create a component that will preload our market data
const MarketDataPreloader = () => {
  useEffect(() => {
    // Start fetching hot pools data as soon as the app loads
    console.log("Preloading market data on app initialization");
    
    // Start fetching hot pools data immediately
    fetchHotPools().catch(err => {
      console.error("Failed to preload hot pools data:", err);
    });
    
    // Also fetch recent tokens data
    fetchRecentTokens().catch(err => {
      console.error("Failed to preload recent tokens data:", err);
    });
  }, []);
  
  return null; // This component doesn't render anything
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <AuthProvider>
        <ProfileProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MarketDataPreloader />
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
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/profile/:username" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/market" element={<MarketWatcher />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
