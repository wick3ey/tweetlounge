
import React from 'react';
import { useMarketStats } from '@/utils/coingeckoService';
import { RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  if (loading && !marketStats) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <h3 className="font-bold text-lg text-white">Market Stats</h3>
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1.5"></div>
            <span className="text-xs text-gray-400 bg-gray-800/70 rounded-full px-2.5 py-0.5">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg h-20 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Failed to load market data</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-white">Market Stats</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1.5 animate-pulse"></div>
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
        </div>
      </div>

      {marketStats && (
        <div className="grid grid-cols-2 gap-3">
          {/* Total Market Cap */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <span>Total Market Cap</span>
            </div>
            <div className="font-mono text-xl font-bold text-blue-400">
              {formatCurrency(marketStats.total_market_cap)}
            </div>
          </div>
          
          {/* BTC Dominance */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <span>BTC Dominance</span>
            </div>
            <div className="font-mono text-xl font-bold text-amber-500">
              {marketStats.btc_dominance.toFixed(1)}%
            </div>
          </div>
          
          {/* 24h Volume */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <Clock className="w-3 h-3" />
              <span>24h Volume</span>
            </div>
            <div className="font-mono text-xl font-bold text-blue-400">
              {formatCurrency(marketStats.total_volume)}
            </div>
          </div>
          
          {/* ETH Dominance */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <span>ETH Dominance</span>
            </div>
            <div className="font-mono text-xl font-bold text-purple-500">
              {marketStats.eth_dominance.toFixed(1)}%
            </div>
          </div>
          
          {/* Active Cryptocurrencies */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <span>Active Cryptocurrencies</span>
            </div>
            <div className="font-mono text-xl font-bold text-teal-400">
              {marketStats.active_cryptocurrencies?.toLocaleString()}
            </div>
          </div>
          
          {/* Fear & Greed Index */}
          <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-1 text-gray-400 text-xs">
              <ArrowRight className="w-3 h-3" />
              <span>Fear & Greed Index</span>
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: getFearGreedColor(marketStats.fear_greed_value) }}>
              {getFearGreedLabel(marketStats.fear_greed_value)}
            </div>
          </div>
        </div>
      )}
      
      {marketStats?.lastUpdated && (
        <div className="text-[10px] text-gray-500 text-right mt-2">
          Last updated: {new Date(marketStats.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default MarketStats;
