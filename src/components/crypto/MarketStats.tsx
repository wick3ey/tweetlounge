
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, BarChart, Clock, Coins, TrendingUp, Activity, Loader2, AlertTriangle, RotateCw } from 'lucide-react'
import { useMarketStats } from '@/utils/coingeckoService'
import { toast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { CryptoButton } from "@/components/ui/crypto-button"

// Default fallback market data
const fallbackMarketData = {
  total_market_cap: 2821150162185,
  total_volume: 110950262631,
  btc_dominance: 58.86,
  eth_dominance: 8.00,
  active_cryptocurrencies: 17159,
  market_cap_change_percentage_24h: -5.83,
  fear_greed_value: 44,
  fear_greed_label: "Fear"
};

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

// Helper function to determine fear & greed status
const getFearGreedStatus = (value: number | undefined, label: string | undefined): { text: string; color: string } => {
  if (label) {
    // If we have a label from the API, use it
    const fearGreedMap: Record<string, string> = {
      'Extreme Fear': 'text-crypto-red',
      'Fear': 'text-orange-400',
      'Neutral': 'text-crypto-blue',
      'Greed': 'text-crypto-green',
      'Extreme Greed': 'text-crypto-green'
    };
    
    return { 
      text: label, 
      color: fearGreedMap[label] || 'text-crypto-lightgray' 
    };
  }
  
  // Fallback to calculation based on market cap change if no label
  const change = value || 0;
  
  if (change >= 80) return { text: 'Extreme Greed', color: 'text-crypto-green' };
  if (change >= 60) return { text: 'Greed', color: 'text-crypto-green' };
  if (change >= 40) return { text: 'Neutral', color: 'text-crypto-blue' };
  if (change >= 20) return { text: 'Fear', color: 'text-orange-400' };
  return { text: 'Extreme Fear', color: 'text-crypto-red' };
};

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState(0);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  // Use fallback data when API fails
  const displayStats = marketStats || fallbackMarketData;
  
  // Display toast on error only when manually refreshed
  useEffect(() => {
    if (error && isManualRefresh) {
      toast({
        title: "Market Data Error",
        description: "Could not update market data. Using cached or fallback data.",
        variant: "destructive"
      });
      setIsManualRefresh(false);
    }
  }, [error, isManualRefresh]);
  
  // Auto-retry once if initial load fails
  useEffect(() => {
    if (error && retryCount < 1 && (Date.now() - lastRefreshAttempt > 10000)) {
      console.log("Auto-retrying market stats fetch after error");
      const timer = setTimeout(() => {
        setRetryCount(count => count + 1);
        setLastRefreshAttempt(Date.now());
        refreshData();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, lastRefreshAttempt, refreshData]);
  
  // Get Fear & Greed status - use the value from API if available, otherwise use market cap change
  const fearGreed = getFearGreedStatus(
    displayStats.fear_greed_value,
    displayStats.fear_greed_label
  );
  
  const handleRefresh = async () => {
    setIsManualRefresh(true);
    setLastRefreshAttempt(Date.now());
    
    toast({
      title: "Refreshing Data",
      description: "Fetching latest market data...",
    });
    
    await refreshData();
    
    if (!error) {
      toast({
        title: "Data Refreshed",
        description: "Market data has been updated.",
      });
    }
  };

  return (
    <Card className="crypto-stats-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-crypto-blue mr-2" />
            <CardTitle className="text-base font-display">Market Stats</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CryptoButton 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              className="h-7 w-7" 
              aria-label="Refresh data"
              disabled={loading}
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </CryptoButton>
            <div className="flex items-center text-xs bg-crypto-blue/20 text-crypto-blue rounded-full px-2 py-0.5">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Loading
                </span>
              ) : error ? (
                <span className="flex items-center text-amber-500">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Fallback
                </span>
              ) : (
                <>
                  <span className="mr-1">Live</span>
                  <div className="w-2 h-2 rounded-full bg-crypto-blue animate-pulse"></div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Coins className="w-3.5 h-3.5 mr-1" />
              <span>Total Market Cap</span>
            </div>
            <div className="font-display font-semibold">
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-20"></div> : 
                formatNumber(displayStats.total_market_cap, 'currency')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <BarChart className="w-3.5 h-3.5 mr-1" />
              <span>BTC Dominance</span>
            </div>
            <div className="font-display font-semibold">
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-16"></div> : 
                formatNumber(displayStats.btc_dominance, 'percentage')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>24h Volume</span>
            </div>
            <div className="font-display font-semibold">
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-20"></div> : 
                formatNumber(displayStats.total_volume, 'currency')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              <span>ETH Dominance</span>
            </div>
            <div className="font-display font-semibold">
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-16"></div> : 
                formatNumber(displayStats.eth_dominance, 'percentage')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Coins className="w-3.5 h-3.5 mr-1" />
              <span>Active Cryptocurrencies</span>
            </div>
            <div className="font-display font-semibold">
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-16"></div> : 
                formatNumber(displayStats.active_cryptocurrencies)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Fear & Greed Index</span>
            </div>
            <div className={`font-display font-semibold ${fearGreed.color}`}>
              {loading ? 
                <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-24"></div> : 
                fearGreed.text}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MarketStats
