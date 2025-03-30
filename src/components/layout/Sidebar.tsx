
import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Bell, Mail, User, Hash, Settings, BarChart2, Compass, Bookmark, Shield, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CryptoButton } from '@/components/ui/crypto-button'

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [expanded, setExpanded] = useState(false);
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Hash, label: 'Trends', path: '/trends' },
    { icon: BarChart2, label: 'Markets', path: '/market' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Shield, label: 'Security', path: '/security' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  return (
    <div className={`h-screen bg-crypto-darkgray border-r border-crypto-gray/40 ${expanded ? 'w-48' : 'w-16'} flex flex-col items-center pt-4 crypto-gradient-bg shadow-lg transition-all duration-300`}>
      <div className="mb-8 flex items-center justify-center w-full">
        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-crypto-blue text-white hover:brightness-110 transition-all shadow-glow-sm hover:shadow-glow-md">
          <span className="text-xl font-bold">K</span>
        </Link>
      </div>
      
      <div className="absolute top-4 right-0 transform translate-x-1/2">
        <CryptoButton 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-6 w-6 rounded-full bg-crypto-darkgray border border-crypto-gray/40 shadow-md"
        >
          <ChevronRight className={`h-4 w-4 text-crypto-lightgray transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </CryptoButton>
      </div>
      
      <TooltipProvider delayDuration={300}>
        <nav className={`flex flex-col ${expanded ? 'items-start pl-4 w-full' : 'items-center'} space-y-1`}>
          {menuItems.map((item) => (
            <Tooltip key={item.path} delayDuration={100}>
              <TooltipTrigger asChild>
                <Link 
                  to={item.path} 
                  className={`crypto-sidebar-item flex items-center ${expanded ? 'justify-start w-full pr-2' : 'justify-center'} ${currentPath === item.path ? 'active text-crypto-blue' : 'text-crypto-lightgray'}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span className="ml-3 transition-opacity">{item.label}</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                className="bg-crypto-darkgray border-crypto-gray/60 text-white"
                hidden={expanded}
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
      
      <div className="mt-auto mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 p-[2px] ring-2 ring-crypto-gray/20">
          <div className="w-full h-full rounded-full bg-crypto-darkgray flex items-center justify-center">
            <User className="w-4 h-4 text-crypto-lightgray" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
