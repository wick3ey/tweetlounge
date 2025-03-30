
import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Navbar from './Navbar';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullHeight?: boolean;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-crypto-black text-crypto-text">
      <Navbar />
      <div className="flex flex-1 w-full container mx-auto">
        <LeftSidebar />
        
        <main className={`flex-1 border-x border-crypto-gray/30 ${fullHeight ? 'min-h-screen' : ''}`}>
          {children}
        </main>
        
        {!hideRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
