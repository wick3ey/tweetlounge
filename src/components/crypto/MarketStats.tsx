import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, BarChart, Clock, Coins, TrendingUp, Activity, Loader2, AlertTriangle, RotateCw, TrendingDown, ExternalLink } from 'lucide-react'
import { useMarketStats } from '@/utils/coingeckoService'
import { toast } from '@/hooks/use-toast'
import { useEffect } from 'react'
import { CryptoButton } from "@/components/ui/crypto-button"
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  } else if (type === 'percentage') {
    return `${num.toFixed(1)}%`;
  } else {
    return num.toLocaleString('en-US');
  }
};

// Helper function to determine fear & greed status
const getFearGreedStatus = (value: number | undefined, label: string | undefined): { text: string; color: string; bg: string; icon: React.ElementType } => {
  if (label) {
    const fearGreedMap: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
      'Extreme Fear': { color: 'text-crypto-red font-bold', bg: 'bg-red-500/10', icon: TrendingDown },
      'Fear': { color: 'text-orange-400 font-bold', bg: 'bg-orange-400/10', icon: TrendingDown },
      'Neutral': { color: 'text-crypto-blue font-bold', bg: 'bg-crypto-blue/10', icon: Activity },
      'Greed': { color: 'text-crypto-green font-bold', bg: 'bg-green-500/10', icon: TrendingUp },
      'Extreme Greed': { color: 'text-crypto-green font-bold', bg: 'bg-green-500/10', icon: TrendingUp }
    };
    
    return { 
      text: label, 
      color: fearGreedMap[label]?.color || 'text-crypto-lightgray', 
      bg: fearGreedMap[label]?.bg || 'bg-crypto-lightgray/10',
      icon: fearGreedMap[label]?.icon || Activity
    };
  }
  
  const change = value || 0;
  
  if (change >= 80) return { text: 'Extreme Greed', color: 'text-crypto-green font-bold', bg: 'bg-green-500/10', icon: TrendingUp };
  if (change >= 60) return { text: 'Greed', color: 'text-crypto-green font-bold', bg: 'bg-green-500/10', icon: TrendingUp };
  if (change >= 40) return { text: 'Neutral', color: 'text-crypto-blue font-bold', bg: 'bg-crypto-blue/10', icon: Activity };
  if (change >= 20) return { text: 'Fear', color: 'text-orange-400 font-bold', bg: 'bg-orange-400/10', icon: TrendingDown };
  return { text: 'Extreme Fear', color: 'text-crypto-red font-bold', bg: 'bg-red-500/10', icon: TrendingDown };
};

// Individual stat item component
interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  loading?: boolean;
  change?: number;
  colorClass?: string;
  bgClass?: string;
  onClick?: () => void;
}

const StatItem: React.FC<StatItemProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  loading = false,
  change,
  colorClass = "", 
  bgClass = "bg-crypto-gray/10",
  onClick
}) => {
  const isClickable = !!onClick;
  const hasChange = change !== undefined;
  
  return (
    <motion.div 
      className={`rounded-xl p-3 ${bgClass} ${isClickable ? 'cursor-pointer hover:brightness-110 transition-all' : ''}`}
      whileHover={isClickable ? { scale: 1.02 } : {}}
      onClick={onClick}
    >
      <div className="flex items-center text-xs text-crypto-lightgray mb-1">
        <Icon className="w-3.5 h-3.5 mr-1" />
        <span>{label}</span>
      </div>
      <div className={`text-base font-display font-semibold flex items-center ${colorClass}`}>
        {loading ? (
          <div className="animate-pulse h-5 bg-crypto-gray/20 rounded w-20"></div>
        ) : (
          <>
            {value}
            {hasChange && (
              <span className={`text-xs ml-1 ${change > 0 ? 'text-crypto-green' : change < 0 ? 'text-crypto-red' : ''}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

const MarketStats: React.FC = () => {
  const { marketStats, loading, error, refreshData } = useMarketStats();
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState(0);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  
  const displayStats = marketStats || fallbackMarketData;
  
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

  const toggleExpandStat = (statName: string) => {
    if (expandedStat === statName) {
      setExpandedStat(null);
    } else {
      setExpandedStat(statName);
    }
  };

  const getLastUpdatedInfo = () => {
    if (!marketStats) return "Using fallback data";
    
    const currentTime = new Date();
    const now = new Date();
    const diffMs = now.getTime() - currentTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  return (
    <Card className="border-none bg-black/70 backdrop-blur-md shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-2 w-6 h-6 rounded-full bg-gradient-to-tr from-crypto-blue to-purple-500 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <CardTitle className="text-base font-display">Market Stats</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CryptoButton 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              className="h-7 w-7 hover:bg-crypto-blue/20 hover:text-crypto-blue transition-colors" 
              aria-label="Refresh data"
              disabled={loading}
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </CryptoButton>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {loading ? "Fetching latest data..." : 
                   error ? "Using fallback or cached data" : 
                   `Last updated: ${getLastUpdatedInfo()}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 mt-2">
          <StatItem
            icon={Coins}
            label="Total Market Cap"
            value={formatNumber(displayStats.total_market_cap, 'currency')}
            loading={loading}
            colorClass="text-blue-400"
            bgClass="bg-blue-500/5 hover:bg-blue-500/10"
            onClick={() => toggleExpandStat('marketCap')}
          />
          
          <StatItem
            icon={BarChart}
            label="BTC Dominance"
            value={formatNumber(displayStats.btc_dominance, 'percentage')}
            loading={loading}
            colorClass="text-amber-400"
            bgClass="bg-amber-500/5 hover:bg-amber-500/10"
            onClick={() => toggleExpandStat('btcDom')}
          />
          
          <StatItem
            icon={Clock}
            label="24h Volume"
            value={formatNumber(displayStats.total_volume, 'currency')}
            loading={loading}
            colorClass="text-indigo-400"
            bgClass="bg-indigo-500/5 hover:bg-indigo-500/10"
            onClick={() => toggleExpandStat('volume')}
          />
          
          <StatItem
            icon={ArrowUpRight}
            label="ETH Dominance"
            value={formatNumber(displayStats.eth_dominance, 'percentage')}
            loading={loading}
            colorClass="text-purple-400"
            bgClass="bg-purple-500/5 hover:bg-purple-500/10"
            onClick={() => toggleExpandStat('ethDom')}
          />
          
          <StatItem
            icon={Coins}
            label="Active Cryptocurrencies"
            value={formatNumber(displayStats.active_cryptocurrencies)}
            loading={loading}
            colorClass="text-teal-400"
            bgClass="bg-teal-500/5 hover:bg-teal-500/10"
            onClick={() => toggleExpandStat('activeCrypto')}
          />
          
          <StatItem
            icon={fearGreed.icon}
            label="Fear & Greed Index"
            value={fearGreed.text}
            loading={loading}
            colorClass={fearGreed.color}
            bgClass={fearGreed.bg}
            onClick={() => toggleExpandStat('fearGreed')}
          />
        </div>
        
        {expandedStat && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-800/60"
          >
            {expandedStat === 'marketCap' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Market Capitalization</h4>
                <p className="text-xs text-muted-foreground">
                  The total market value of all cryptocurrencies combined. This is calculated by multiplying the price of each coin by its circulating supply.
                </p>
                <a 
                  href="https://coinmarketcap.com/charts/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-crypto-blue flex items-center mt-2 hover:underline"
                >
                  View detailed market cap charts <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}
            
            {expandedStat === 'btcDom' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Bitcoin Dominance</h4>
                <p className="text-xs text-muted-foreground">
                  Bitcoin's market capitalization as a percentage of the total cryptocurrency market cap. This metric shows Bitcoin's influence in the crypto market.
                </p>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-amber-400 rounded-full" 
                    style={{ width: `${Math.min(100, displayStats.btc_dominance)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {expandedStat === 'volume' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">24h Trading Volume</h4>
                <p className="text-xs text-muted-foreground">
                  The total amount of trading activity across all cryptocurrencies in the last 24 hours. High volume indicates active trading markets.
                </p>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span>% of Market Cap: </span>
                  <span className="font-medium">
                    {(displayStats.total_volume / displayStats.total_market_cap * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            
            {expandedStat === 'ethDom' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Ethereum Dominance</h4>
                <p className="text-xs text-muted-foreground">
                  Ethereum's market capitalization as a percentage of the total cryptocurrency market cap. This shows Ethereum's position in the market.
                </p>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-purple-400 rounded-full" 
                    style={{ width: `${Math.min(100, displayStats.eth_dominance)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {expandedStat === 'activeCrypto' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Active Cryptocurrencies</h4>
                <p className="text-xs text-muted-foreground">
                  The total number of cryptocurrencies actively trading across markets. This number continues to grow as new projects launch.
                </p>
                <div className="text-xs flex justify-between mt-2">
                  <span>Avg. Market Cap per Coin:</span>
                  <span className="font-medium">
                    {formatNumber(displayStats.total_market_cap / displayStats.active_cryptocurrencies, 'currency')}
                  </span>
                </div>
              </div>
            )}
            
            {expandedStat === 'fearGreed' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Fear & Greed Index</h4>
                <p className="text-xs text-muted-foreground">
                  A sentiment indicator that analyzes emotions and sentiments of cryptocurrency investors. Extreme fear indicates buying opportunities, while extreme greed suggests market correction.
                </p>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full ${
                      fearGreed.text === 'Extreme Fear' ? 'bg-red-500' :
                      fearGreed.text === 'Fear' ? 'bg-orange-400' :
                      fearGreed.text === 'Neutral' ? 'bg-blue-400' :
                      fearGreed.text === 'Greed' ? 'bg-green-400' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, displayStats.fear_greed_value || 50)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-red-400">Extreme Fear</span>
                  <span className="text-green-400">Extreme Greed</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketStats;
