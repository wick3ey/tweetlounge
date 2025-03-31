
import React, { useState, useEffect } from 'react';
import { useMarketStats } from '@/utils/coingeckoService';
import { RefreshCw, ArrowUp, ArrowDown, TrendingUp, InfoIcon, Gauge, Bitcoin, BarChart3, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

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

// Get fear & greed color based on value
const getFearGreedColor = (value: number | undefined): string => {
  if (value === undefined) return '#888888';
  if (value <= 20) return '#e15241'; // Extreme Fear (red)
  if (value <= 40) return '#e78d3c'; // Fear (orange)
  if (value <= 60) return '#f2c94c'; // Neutral (yellow)
  if (value <= 80) return '#7cc474'; // Greed (light green)
  return '#00c853'; // Extreme Greed (green)
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

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [refreshing, setRefreshing] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#3b82f6'); // blue-500
  const [minimized, setMinimized] = useState(false);
  
  const colors = [
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setHighlightColor(randomColor);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-gray-800 text-blue-400">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-bold text-sm text-white">Market Overview</h3>
        </div>
        <button
          onClick={() => setMinimized(!minimized)}
          className="p-1 hover:bg-gray-800 rounded-full transition-colors"
        >
          <ChevronUp 
            className={`h-4 w-4 text-gray-400 transition-transform ${minimized ? 'rotate-180' : ''}`} 
          />
        </button>
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
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-16 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-16 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-16 rounded-lg bg-gray-800/50" />
                  <Skeleton className="h-16 rounded-lg bg-gray-800/50" />
                </div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm p-2 bg-red-900/20 border border-red-900/30 rounded-lg">
                Unable to load market data
              </div>
            ) : marketStats ? (
              <div className="space-y-3">
                {/* Top row stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="backdrop-blur-sm bg-gradient-to-br from-gray-800/40 to-gray-900/40 p-3 rounded-lg border border-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">Total Market Cap</div>
                      <Bitcoin className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-1">
                      <div className="font-mono text-white text-lg font-medium">
                        {formatCurrency(marketStats.total_market_cap)}
                      </div>
                      <div className={`flex items-center text-xs ${marketStats.market_cap_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {marketStats.market_cap_change_percentage_24h >= 0 ? (
                          <ArrowUp className="h-3 w-3 mr-0.5" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-0.5" />
                        )}
                        {Math.abs(marketStats.market_cap_change_percentage_24h).toFixed(2)}% (24h)
                      </div>
                    </div>
                  </div>
                  
                  <div className="backdrop-blur-sm bg-gradient-to-br from-gray-800/40 to-gray-900/40 p-3 rounded-lg border border-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">24h Volume</div>
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-1">
                      <div className="font-mono text-white text-lg font-medium">
                        {formatCurrency(marketStats.total_volume)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {((marketStats.total_volume / marketStats.total_market_cap) * 100).toFixed(1)}% of market cap
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Middle stats row */}
                <div className="grid grid-cols-2 gap-2 my-2">
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="backdrop-blur-sm bg-gradient-to-br from-gray-800/40 to-gray-900/40 p-2.5 rounded-lg border border-gray-800/50 cursor-help">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-xs text-gray-400">BTC Dominance</div>
                            <div className="flex gap-1 items-center">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <span className="text-xs font-medium text-white">{marketStats.btc_dominance.toFixed(1)}%</span>
                            </div>
                          </div>
                          <Progress 
                            value={marketStats.btc_dominance} 
                            max={100} 
                            className="h-1.5 bg-gray-700"
                            indicatorClassName="bg-amber-500" 
                          />
                          <div className="flex justify-between items-center mt-1">
                            <div className="text-xs text-gray-400">ETH Dominance</div>
                            <div className="flex gap-1 items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-xs font-medium text-white">{marketStats.eth_dominance.toFixed(1)}%</span>
                            </div>
                          </div>
                          <Progress 
                            value={marketStats.eth_dominance} 
                            max={100} 
                            className="h-1.5 bg-gray-700"
                            indicatorClassName="bg-blue-500" 
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] bg-gray-800 border-gray-700 p-2 text-xs">
                        Bitcoin and Ethereum's percentage share of the total cryptocurrency market capitalization
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Fear & Greed Index */}
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="backdrop-blur-sm bg-gradient-to-br from-gray-800/40 to-gray-900/40 p-2.5 rounded-lg border border-gray-800/50 cursor-help">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-xs text-gray-400">Fear & Greed</div>
                            <div className="flex items-center gap-1">
                              <Gauge className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-medium text-white">{marketStats.fear_greed_value || "?"}</span>
                            </div>
                          </div>
                          <div className="relative h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
                            {marketStats.fear_greed_value && (
                              <div 
                                className="absolute top-0 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-md transform -translate-x-1/2"
                                style={{ left: `${marketStats.fear_greed_value}%` }}
                              />
                            )}
                          </div>
                          <div className="text-xs text-center mt-1.5 font-medium" style={{ color: getFearGreedColor(marketStats.fear_greed_value) }}>
                            {getFearGreedLabel(marketStats.fear_greed_value)}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] bg-gray-800 border-gray-700 p-2 text-xs">
                        Crypto Fear & Greed Index - Extreme fear indicates a buying opportunity, while extreme greed suggests a market correction might be due
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div>
                    {marketStats.active_cryptocurrencies?.toLocaleString()} active coins
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 flex items-center gap-1" 
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
                
                {marketStats.lastUpdated && (
                  <div className="text-[10px] text-gray-500 text-right">
                    Last updated: {new Date(marketStats.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketStats;
