
import React from 'react'
import { BellIcon, Search } from 'lucide-react'
import { CryptoButton } from '../ui/crypto-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const Header: React.FC = () => {
  return (
    <div className="w-full bg-crypto-darkgray border-b border-crypto-gray p-3 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl text-crypto-blue font-display font-bold mr-4">KryptoSphere</h1>
        <div className="bg-crypto-black rounded-full border border-crypto-gray flex items-center px-3 py-1.5 w-64">
          <Search className="w-4 h-4 text-crypto-lightgray mr-2" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none text-sm focus:outline-none w-full"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="relative p-2 rounded-full hover:bg-crypto-gray/20">
          <BellIcon className="w-5 h-5 text-crypto-lightgray" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-crypto-blue rounded-full"></span>
        </button>
        
        <CryptoButton className="rounded-full bg-crypto-blue text-white hover:bg-crypto-darkblue">
          Connect Wallet
        </CryptoButton>
        
        <Avatar className="h-8 w-8 border border-crypto-gray/50">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-crypto-gray text-white text-xs">JD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}

export default Header
