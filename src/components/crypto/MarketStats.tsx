
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, BarChart, Clock, Coins, TrendingUp, Activity, Loader2 } from 'lucide-react'
import { useMarketStats } from '@/utils/coingeckoService'

// Helper function to format large numbers
const formatNumber = (num: number | undefined, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  if (num === undefined) return 'N/A';
  
  if (type === 'currency') {
    // Format as currency with appropriate suffix (T for trillion, B for billion)
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  } else if (type === 'percentage') {
    // Format as percentage with one decimal place
    return `${num.toFixed(1)}%`;
  } else {
    // Format as regular number with commas
    return num.toLocaleString('en-US');
  }
};

// Helper function to determine fear & greed status based on market cap change
const getFearGreedStatus = (change: number | undefined): { text: string; color: string } => {
  if (change === undefined) return { text: 'N/A', color: 'text-crypto-lightgray' };
  
  if (change >= 15) return { text: 'Extreme Greed', color: 'text-crypto-green' };
  if (change >= 5) return { text: 'Greed', color: 'text-crypto-green' };
  if (change >= -5) return { text: 'Neutral', color: 'text-crypto-blue' };
  if (change >= -15) return { text: 'Fear', color: 'text-orange-400' };
  return { text: 'Extreme Fear', color: 'text-crypto-red' };
};

const MarketStats: React.FC = () => {
  const { marketStats, loading, error } = useMarketStats();
  
  // Calculate a simple Fear & Greed value based on 24h market cap change
  const fearGreed = getFearGreedStatus(marketStats?.market_cap_change_percentage_24h);

  return (
    <Card className="crypto-stats-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-crypto-blue mr-2" />
            <CardTitle className="text-base font-display">Market Stats</CardTitle>
          </div>
          <div className="flex items-center text-xs bg-crypto-blue/20 text-crypto-blue rounded-full px-2 py-0.5">
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Loading
              </span>
            ) : (
              <>
                <span className="mr-1">Live</span>
                <div className="w-2 h-2 rounded-full bg-crypto-blue animate-pulse"></div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="text-crypto-red text-sm py-4">
            Failed to load market data. Using fallback data.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <Coins className="w-3.5 h-3.5 mr-1" />
                <span>Total Market Cap</span>
              </div>
              <div className="font-display font-semibold">
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  formatNumber(marketStats?.total_market_cap, 'currency')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <BarChart className="w-3.5 h-3.5 mr-1" />
                <span>BTC Dominance</span>
              </div>
              <div className="font-display font-semibold">
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  formatNumber(marketStats?.btc_dominance, 'percentage')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span>24h Volume</span>
              </div>
              <div className="font-display font-semibold">
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  formatNumber(marketStats?.total_volume, 'currency')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                <span>ETH Dominance</span>
              </div>
              <div className="font-display font-semibold">
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  formatNumber(marketStats?.eth_dominance, 'percentage')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <Coins className="w-3.5 h-3.5 mr-1" />
                <span>Active Cryptocurrencies</span>
              </div>
              <div className="font-display font-semibold">
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  formatNumber(marketStats?.active_cryptocurrencies)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-crypto-lightgray">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                <span>Fear & Greed Index</span>
              </div>
              <div className={`font-display font-semibold ${fearGreed.color}`}>
                {loading ? 
                  <Loader2 className="w-4 h-4 animate-spin text-crypto-lightgray" /> : 
                  fearGreed.text}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MarketStats
