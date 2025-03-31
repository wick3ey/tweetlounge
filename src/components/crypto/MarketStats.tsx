
import React, { useState, useEffect } from 'react';
import { useMarketStats } from '@/utils/coingeckoService';
import { RefreshCw, ChevronUp, Clock, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format large numbers with T for trillion, B for billion, etc.
const formatCurrency = (value: number): string => {
  if (value >= 1000000000000) {
    return `$${(value / 1000000000000).toFixed(2)}T`;
  } else if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else {
    return `$${value.toLocaleString()}`;
  }
};

// Get fear & greed label
const getFearGreedLabel = (value: number | undefined): string => {
  if (value === undefined) return 'Unknown';
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
};

// Get color for fear & greed index
const getFearGreedColor = (value: number | undefined): string => {
  if (value === undefined) return '#888888';
  if (value <= 20) return '#e15241'; // Extreme Fear (red)
  if (value <= 40) return '#ff9800'; // Fear (orange)
  if (value <= 60) return '#f2c94c'; // Neutral (yellow)
  if (value <= 80) return '#7cc474'; // Greed (light green)
  return '#00c853'; // Extreme Greed (green)
};

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [refreshing, setRefreshing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
            </svg>
          </div>
          <h3 className="font-bold text-base text-white">Market Stats</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1.5"></div>
            <span className="text-xs text-gray-300 bg-gray-800/70 rounded-full px-2.5 py-0.5">Live</span>
          </div>

          <Button
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full hover:bg-gray-800 text-gray-400"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronUp 
              className={`h-4 w-4 text-gray-400 transition-transform ${minimized ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {loading && !marketStats ? (
              <div className="space-y-2 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-20 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-20 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-20 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-20 rounded-lg bg-gray-800/50" />
                </div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm p-2 bg-red-900/20 border border-red-900/30 rounded-lg">
                Unable to load market data
              </div>
            ) : marketStats ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Total Market Cap */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.5h.008v.008H9V18Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM12 6a.375.375 0 1 1 0-.75.375.375 0 0 1 0 .75Zm-.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm2.625 9.5h.008v.008h-.008v-.008ZM15 18a.375.375 0 1 1 0-.75.375.375 0 0 1 0 .75Z" />
                    </svg>
                    <span className="text-sm text-gray-400">Total Market Cap</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-blue-400">
                    {formatCurrency(marketStats.total_market_cap)}
                  </div>
                </div>
                
                {/* BTC Dominance */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"></path>
                    </svg>
                    <span className="text-sm text-gray-400">BTC Dominance</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-amber-500">
                    {marketStats.btc_dominance.toFixed(1)}%
                  </div>
                </div>
                
                {/* 24h Volume */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">24h Volume</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-blue-400">
                    {formatCurrency(marketStats.total_volume)}
                  </div>
                </div>
                
                {/* ETH Dominance */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <path d="M12 2v4"></path>
                      <path d="m4.93 10.93 2.83 2.83"></path>
                      <path d="M2 18h4"></path>
                      <path d="m16.24 13.76 2.83 2.83"></path>
                      <path d="M18 2h4"></path>
                      <path d="m13.76 7.76 2.83-2.83"></path>
                      <path d="M2 6h4"></path>
                      <path d="m7.76 10.24-2.83-2.83"></path>
                    </svg>
                    <span className="text-sm text-gray-400">ETH Dominance</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-purple-500">
                    {marketStats.eth_dominance.toFixed(1)}%
                  </div>
                </div>
                
                {/* Active Cryptocurrencies */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                    <span className="text-sm text-gray-400">Active Cryptocurrencies</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-teal-400">
                    {marketStats.active_cryptocurrencies?.toLocaleString()}
                  </div>
                </div>
                
                {/* Fear & Greed Index */}
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800/70">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Fear & Greed Index</span>
                  </div>
                  <div className="font-mono text-xl font-bold" style={{ color: getFearGreedColor(marketStats.fear_greed_value) }}>
                    {getFearGreedLabel(marketStats.fear_greed_value)}
                  </div>
                </div>
              </div>
            ) : null}
            
            {marketStats?.lastUpdated && (
              <div className="text-[10px] text-gray-500 text-right mt-2">
                Last updated: {new Date(marketStats.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketStats;
