
import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Navbar from './Navbar';
import CryptoTicker from '@/components/crypto/CryptoTicker';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullHeight?: boolean;
  pageTitle?: string;
  fullWidth?: boolean; // Added for pages that need full width like Market
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true,
  pageTitle,
  fullWidth = false // Default to standard width
}) => {
  return (
    <div className="flex flex-col h-screen bg-black">
      <Navbar />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 w-full max-w-[1400px] mx-auto">
        <LeftSidebar />
        
        <main className={`flex-1 ${fullWidth ? 'w-full' : 'max-w-[600px]'} border-x border-gray-800 overflow-y-auto ${fullHeight ? 'min-h-screen' : ''}`}>
          {pageTitle && (
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>
          )}
          {children}
        </main>
        
        {!hideRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
