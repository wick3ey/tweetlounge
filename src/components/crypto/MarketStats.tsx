
import React from 'react';
import { useMarketStats } from '@/utils/coingeckoService';
import { RefreshCw, ArrowUp, ArrowDown, TrendingUp, InfoIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [refreshing, setRefreshing] = React.useState(false);

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

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Market Stats</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && !marketStats ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm">Unable to load market data</div>
      ) : marketStats ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-400">Market Cap</div>
            <div className="font-medium">{formatLargeNumber(marketStats.total_market_cap)}</div>
          </div>
          
          <div>
            <div className="text-gray-400">24h Volume</div>
            <div className="font-medium">{formatLargeNumber(marketStats.total_volume)}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">BTC Dominance</span>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3 w-3 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 text-xs">
                    Bitcoin's share of the total market capitalization
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="font-medium">{marketStats.btc_dominance.toFixed(1)}%</div>
          </div>
          
          <div>
            <div className="text-gray-400">Market Change 24h</div>
            <div className={`font-medium flex items-center ${marketStats.market_cap_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {marketStats.market_cap_change_percentage_24h >= 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(marketStats.market_cap_change_percentage_24h).toFixed(2)}%
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketStats;
