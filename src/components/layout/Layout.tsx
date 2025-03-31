
import React, { useState, useEffect } from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Navbar from './Navbar';
import CryptoTicker from '@/components/crypto/CryptoTicker';
import MobileNavigation from './MobileNavigation';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullHeight?: boolean;
  pageTitle?: string;
  collapsedSidebar?: boolean;
  fullWidth?: boolean;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true,
  pageTitle,
  collapsedSidebar = false,
  fullWidth = false
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Navbar />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className={`flex flex-1 w-full ${fullWidth ? 'max-w-[100%]' : 'max-w-[1500px]'} mx-auto`}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <LeftSidebar collapsed={collapsedSidebar} />
        </div>
        
        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <div className="fixed bottom-16 left-4 z-50">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-r border-gray-800 bg-black w-[85%] max-w-[300px]">
                <div className="h-full">
                  <LeftSidebar collapsed={false} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        
        <main className={`flex-1 overflow-auto ${fullHeight ? 'min-h-screen' : ''} ${
          // Set default max-width for feed, but override for market page and full width pages
          !hideRightSidebar && !fullWidth && !isMobile ? 'max-w-[600px]' : ''
        } ${fullWidth ? '' : 'border-x border-gray-800'}`}>
          {pageTitle && (
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <h1 className="text-xl font-bold pl-8 md:pl-4">{pageTitle}</h1>
            </div>
          )}
          {children}
        </main>
        
        {!hideRightSidebar && !isMobile && <RightSidebar />}
      </div>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNavigation />}
    </div>
  );
};

export default Layout;
