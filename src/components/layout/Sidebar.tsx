
import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Search, Bell, Mail, User, Hash, Settings, BarChart2 } from 'lucide-react'

const Sidebar: React.FC = () => {
  return (
    <div className="h-screen bg-crypto-darkgray border-r border-crypto-gray w-16 flex flex-col items-center pt-4">
      <div className="mb-8">
        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-crypto-blue text-white">
          <span className="text-xl font-bold">K</span>
        </Link>
      </div>
      
      <nav className="flex flex-col items-center space-y-1">
        <Link to="/home" className="crypto-sidebar-item text-crypto-blue">
          <Home className="w-6 h-6" />
        </Link>
        <Link to="/explore" className="crypto-sidebar-item text-crypto-lightgray">
          <Search className="w-6 h-6" />
        </Link>
        <Link to="/trends" className="crypto-sidebar-item text-crypto-lightgray">
          <Hash className="w-6 h-6" />
        </Link>
        <Link to="/analytics" className="crypto-sidebar-item text-crypto-lightgray">
          <BarChart2 className="w-6 h-6" />
        </Link>
        <Link to="/notifications" className="crypto-sidebar-item text-crypto-lightgray">
          <Bell className="w-6 h-6" />
        </Link>
        <Link to="/messages" className="crypto-sidebar-item text-crypto-lightgray">
          <Mail className="w-6 h-6" />
        </Link>
        <Link to="/profile" className="crypto-sidebar-item text-crypto-lightgray">
          <User className="w-6 h-6" />
        </Link>
        <Link to="/settings" className="crypto-sidebar-item text-crypto-lightgray">
          <Settings className="w-6 h-6" />
        </Link>
      </nav>
      
      <div className="mt-auto mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
      </div>
    </div>
  )
}

export default Sidebar
