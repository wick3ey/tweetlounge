
import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
};

const Layout: React.FC<LayoutProps> = ({ children, hideRightSidebar = false }) => {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <LeftSidebar />
      
      <main className="flex-1 border-x border-gray-800 min-h-screen">
        {children}
      </main>
      
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
};

export default Layout;
