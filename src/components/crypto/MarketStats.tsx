
import React, { useState, useEffect } from 'react';
import { useMarketStats } from '@/utils/coingeckoService';
import { RefreshCw, ArrowUp, ArrowDown, TrendingUp, InfoIcon, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [refreshing, setRefreshing] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#3b82f6'); // blue-500
  
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
      setRefreshing(false);
    }
  };

  // Format large numbers with commas and abbreviate millions/billions
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else {
      return `$${num.toLocaleString()}`;
    }
  };

  const StatItem = ({ 
    title, 
    value, 
    change = null, 
    tooltip = null 
  }: { 
    title: string; 
    value: string | React.ReactNode; 
    change?: number | null; 
    tooltip?: string | null 
  }) => {
    return (
      <div className="backdrop-blur-sm bg-gradient-to-br from-gray-800/40 to-gray-900/40 p-2 rounded-lg border border-gray-800/50">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-gray-400 text-xs">{title}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-3 w-3 text-gray-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="font-medium flex items-center text-sm">
          {typeof value === 'string' ? value : value}
          {change !== null && (
            <span className={`ml-1.5 flex items-center text-xs font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? (
                <ArrowUp className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {loading && !marketStats ? (
        <div className="space-y-2 px-1">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-14 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-14 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-14 rounded-lg bg-gray-800/50" />
          </div>
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm p-2 bg-red-900/20 border border-red-900/30 rounded-lg">
          Unable to load market data
        </div>
      ) : marketStats ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-2">
            <StatItem 
              title="Market Cap" 
              value={formatLargeNumber(marketStats.total_market_cap)} 
            />
            
            <StatItem 
              title="24h Volume" 
              value={formatLargeNumber(marketStats.total_volume)} 
            />
            
            <StatItem 
              title="BTC Dominance" 
              value={`${marketStats.btc_dominance.toFixed(1)}%`} 
              tooltip="Bitcoin's share of the total market capitalization"
            />
            
            <StatItem 
              title="Market Change 24h" 
              value={<span style={{ color: highlightColor, transition: 'color 2s ease' }}>
                {marketStats.market_cap_change_percentage_24h >= 0 ? '+' : ''}
                {marketStats.market_cap_change_percentage_24h.toFixed(2)}%
              </span>}
              change={marketStats.market_cap_change_percentage_24h}
            />
          </div>
          
          <div className="mt-2 flex justify-end">
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
        </motion.div>
      ) : null}
    </div>
  );
};

export default MarketStats;
