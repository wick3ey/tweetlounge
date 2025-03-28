
import React, { useState } from 'react'
import { BellIcon, Search, Wallet, Menu } from 'lucide-react'
import { CryptoButton } from '../ui/crypto-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useNavigate } from 'react-router-dom'
import { 
  connectSolanaWallet, 
  updateWalletAddress 
} from '@/utils/walletConnector'
import { useToast } from '@/components/ui/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'

const Header: React.FC = () => {
  const { user } = useAuth()
  const { profile, refreshProfile } = useProfile()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)
  const isMobile = useIsMobile()

  const handleConnectWallet = async () => {
    if (!user) {
      // If user is not logged in, redirect to login page
      navigate('/login')
      return
    }

    setConnecting(true)
    
    try {
      // Connect Solana wallet using the same functionality as in profile page
      const result = await connectSolanaWallet()
      
      if (result.success && result.address) {
        // Update the user's profile with the wallet address
        const updateResult = await updateWalletAddress(user.id, 'solana', result.address)
        
        if (updateResult.success) {
          toast({
            title: "Wallet connected",
            description: "Your Solana wallet has been successfully connected.",
          })
          
          // Refresh the profile to get the updated wallet information
          await refreshProfile()
        } else {
          toast({
            title: "Error",
            description: updateResult.error || "Failed to update your profile with the wallet address.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Failed to connect to your Solana wallet.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      toast({
        title: "Connection error",
        description: "An unexpected error occurred while connecting your wallet.",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  // Check if user already has a connected wallet
  const hasConnectedWallet = !!profile?.solana_address

  return (
    <div className="w-full bg-crypto-darkgray border-b border-crypto-gray p-2 sm:p-3 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-lg sm:text-xl text-crypto-blue font-display font-bold mr-2 sm:mr-4">KryptoSphere</h1>
        <div className="hidden sm:flex bg-crypto-black rounded-full border border-crypto-gray items-center px-3 py-1.5 w-64">
          <Search className="w-4 h-4 text-crypto-lightgray mr-2" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none text-sm focus:outline-none w-full"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button className="relative p-1.5 sm:p-2 rounded-full hover:bg-crypto-gray/20">
          <BellIcon className="w-5 h-5 text-crypto-lightgray" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-crypto-blue rounded-full"></span>
        </button>
        
        {user ? (
          hasConnectedWallet ? (
            <CryptoButton 
              className="rounded-full bg-crypto-green/10 text-crypto-green border border-crypto-green/20 hover:bg-crypto-green/20 text-xs sm:text-sm"
              onClick={() => navigate('/profile')}
            >
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Wallet Connected</span>
              <span className="sm:hidden">Wallet</span>
            </CryptoButton>
          ) : (
            <CryptoButton 
              className="rounded-full bg-crypto-blue text-white hover:bg-crypto-darkblue text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4"
              onClick={handleConnectWallet}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : isMobile ? 'Connect' : 'Connect Wallet'}
            </CryptoButton>
          )
        ) : (
          <CryptoButton 
            className="rounded-full bg-crypto-blue text-white hover:bg-crypto-darkblue text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4"
            onClick={() => navigate('/login')}
          >
            {isMobile ? 'Connect' : 'Connect Wallet'}
          </CryptoButton>
        )}
        
        <Avatar className="h-8 w-8 border border-crypto-gray/50 cursor-pointer" onClick={() => navigate('/profile')}>
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} />
          ) : (
            <AvatarImage src="/placeholder.svg" />
          )}
          <AvatarFallback className="bg-crypto-gray text-white text-xs">
            {profile?.display_name?.substring(0, 2).toUpperCase() || 'JD'}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}

export default Header
