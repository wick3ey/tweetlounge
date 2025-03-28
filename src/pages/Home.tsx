
import React from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import MarketStats from '@/components/crypto/MarketStats'
import TweetInput from '@/components/crypto/TweetInput'
import NewsSection from '@/components/crypto/NewsSection'
import { ZapIcon, TrendingUpIcon, FilterIcon, RefreshCwIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import { Separator } from '@/components/ui/separator'

const Home: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-crypto-black crypto-pattern">
      <Header />
      <CryptoTicker />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto">
          <main className="max-w-xl mx-auto p-4 md:p-6">
            <div className="flex gap-3 items-center mb-5">
              <div className="rounded-lg bg-crypto-gray/20 p-1.5">
                <ZapIcon className="text-crypto-blue h-5 w-5" />
              </div>
              <h1 className="text-xl font-display font-semibold crypto-gradient-text">Trending Activity</h1>
              
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="ml-auto text-xs h-8 border-crypto-gray/40 hover:bg-crypto-gray/30"
              >
                <FilterIcon className="h-3.5 w-3.5 mr-1" />
                Filter
              </CryptoButton>
            </div>
            
            <div className="mb-8">
              <TweetInput />
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <TrendingUpIcon className="h-4 w-4 text-crypto-lightgray mr-2" />
                <h2 className="font-medium text-lg">Top Trends</h2>
              </div>
              
              <div className="grid gap-4 mb-6">
                {/* Placeholder för trend innehåll */}
                <div className="crypto-card p-4 hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-crypto-lightgray">BITCOIN</span>
                    <span className="text-xs text-crypto-price-up">+2.4%</span>
                  </div>
                  <div className="h-10 bg-crypto-gray/20 rounded-lg animate-pulse"></div>
                </div>
                
                <div className="crypto-card p-4 hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-crypto-lightgray">ETHEREUM</span>
                    <span className="text-xs text-crypto-price-down">-0.8%</span>
                  </div>
                  <div className="h-10 bg-crypto-gray/20 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <Separator className="my-6 bg-crypto-gray/20" />
            
            <div className="mt-4 flex items-center justify-between">
              <h2 className="font-medium text-crypto-lightgray">No tweets to display</h2>
              <CryptoButton 
                variant="outline" 
                size="sm" 
                className="h-8 border-crypto-gray/40 hover:bg-crypto-gray/30"
              >
                <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </CryptoButton>
            </div>
          </main>
        </div>
        
        <div className="w-80 overflow-y-auto border-l border-crypto-gray/40 p-5 hidden lg:block">
          <MarketStats />
          <Separator className="my-6 bg-crypto-gray/20" />
          <NewsSection />
        </div>
      </div>
    </div>
  )
}

export default Home
