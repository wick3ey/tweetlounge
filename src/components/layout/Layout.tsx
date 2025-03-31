
import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Navbar from './Navbar';
import { useMediaQuery } from '@/hooks/use-mobile';
import MobileLayout from './MobileLayout';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullHeight?: boolean;
  mobileTitle?: string;
  mobileShowBottomNav?: boolean;
  mobileShowHeader?: boolean;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true,
  mobileTitle = 'TweetLounge',
  mobileShowBottomNav = true,
  mobileShowHeader = true
}) => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  // Use mobile layout on small screens
  if (isMobile) {
    return (
      <MobileLayout 
        title={mobileTitle}
        showBottomNav={mobileShowBottomNav}
        showHeader={mobileShowHeader}
        fullHeight={fullHeight}
      >
        {children}
      </MobileLayout>
    );
  }
  
  // Use desktop layout on larger screens
  return (
    <div className="flex flex-col h-screen bg-crypto-black text-crypto-text overflow-hidden">
      <Navbar />
      <div className="flex flex-1 w-full container mx-auto overflow-hidden">
        <LeftSidebar />
        
        <main className={`flex-1 border-x border-crypto-gray/30 ${fullHeight ? 'h-full' : ''} overflow-hidden flex flex-col`}>
          {children}
        </main>
        
        {!hideRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
