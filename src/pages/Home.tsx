
import React from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import MarketStats from '@/components/crypto/MarketStats'
import TweetInput from '@/components/crypto/TweetInput'
import NewsSection from '@/components/crypto/NewsSection'
import { ZapIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'

const Home: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-crypto-black">
      <Header />
      <CryptoTicker />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto">
          <main className="max-w-xl mx-auto p-4">
            <div className="flex gap-2 items-center mb-4">
              <ZapIcon className="text-crypto-blue h-5 w-5" />
              <h1 className="text-xl font-display font-semibold">Trending</h1>
              <CryptoButton variant="ghost" size="sm" className="ml-auto text-xs h-8">
                Filter
              </CryptoButton>
            </div>
            
            <TweetInput />
            
            <div className="mt-4 flex items-center justify-between">
              <h2 className="font-medium">No tweets to display</h2>
              <CryptoButton variant="outline" size="sm" className="h-8">
                Refresh
              </CryptoButton>
            </div>
          </main>
        </div>
        
        <div className="w-80 overflow-y-auto border-l border-crypto-gray p-4 hidden lg:block">
          <MarketStats />
          <NewsSection />
        </div>
      </div>
    </div>
  )
}

export default Home
