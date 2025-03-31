
import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Navbar from './Navbar';
import CryptoTicker from '@/components/crypto/CryptoTicker';
import { motion } from 'framer-motion';

type LayoutProps = {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullHeight?: boolean;
  pageTitle?: string;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  hideRightSidebar = false,
  fullHeight = true,
  pageTitle
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Navbar />
      <div className="hidden sm:block sticky top-[60px] z-10 w-full bg-black/80 backdrop-blur-md">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 w-full">
        <LeftSidebar />
        
        <motion.main 
          className={`relative flex-1 ml-[70px] md:ml-[240px] max-w-[600px] border-x border-gray-800 overflow-y-auto ${fullHeight ? 'min-h-[calc(100vh-100px)]' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {pageTitle && (
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>
          )}
          {children}
        </motion.main>
        
        {!hideRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
