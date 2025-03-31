
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
  collapsedSidebar?: boolean;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true,
  pageTitle,
  collapsedSidebar = false
}) => {
  return (
    <div className="flex flex-col h-screen bg-black">
      <Navbar />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 w-full max-w-[1500px] mx-auto">
        <LeftSidebar collapsed={collapsedSidebar} />
        
        <main className={`flex-1 ${fullHeight ? 'min-h-screen' : ''} ${
          // Set default max-width for feed, but override for market page
          hideRightSidebar ? '' : 'max-w-[600px]'
        } border-x border-gray-800 overflow-y-auto`}>
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
