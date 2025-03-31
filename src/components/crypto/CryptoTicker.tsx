import React, { useState, useEffect, useCallback, memo, useRef } from 'react'
import { useCryptoData, CryptoCurrency } from '@/utils/coingeckoService'
import { Loader2, RefreshCcw, AlertTriangle, Info } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { CryptoButton } from '@/components/ui/crypto-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Memoize the ticker item for performance
const CryptoTickerItem = memo(({ symbol, price, change }: {
  symbol: string
  price: number
  change: number
}) => {
  // Optimize number formatting
  const formattedPrice = price < 1 
    ? price.toFixed(4) 
    : price < 1000 
      ? price.toFixed(2) 
      : price.toFixed(0)
      
  const formattedChange = change.toFixed(1)
  const changeColor = change >= 0 ? 'crypto-price-up' : 'crypto-price-down'
  const changeSign = change >= 0 ? '+' : ''
  
  return (
    <div className="crypto-ticker-item">
      <span className="font-medium text-white">{symbol}</span>
      <span className="font-medium">${formattedPrice}</span>
      <span className={`text-xs ${changeColor}`}>
        {changeSign}{formattedChange}%
      </span>
    </div>
  )
});

// Rename for clarity that we're using memo
CryptoTickerItem.displayName = 'MemoizedCryptoTickerItem';

// Fallback data to show when API fails
const fallbackCryptoData: CryptoCurrency[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 84000, change: -2.1 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1900, change: -3.5 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', price: 130, change: -4.2 },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 2.2, change: -1.8 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.70, change: -2.4 }
];

const CryptoTicker: React.FC = () => {
  const { cryptoData, loading, error, refreshData } = useCryptoData()
  const [refreshing, setRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState(0);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [isFallbackData, setIsFallbackData] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3); // Default number of times to repeat the ticker
  const tickerContainerRef = useRef<HTMLDivElement>(null);
  const tickerContentRef = useRef<HTMLDivElement>(null);
  
  // Auto-retry with smarter backoff
  useEffect(() => {
    if (error && retryCount < 1 && (Date.now() - lastRefreshAttempt > 10000)) {
      console.log("Auto-retrying crypto ticker fetch after error");
      const timer = setTimeout(() => {
        setRetryCount(count => count + 1);
        setLastRefreshAttempt(Date.now());
        refreshData();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, lastRefreshAttempt, refreshData]);
  
  // Detect fallback data use - optimized
  useEffect(() => {
    if (cryptoData.length > 0) {
      // Quick heuristic check - much faster than deep comparison
      const matchesFallback = cryptoData[0]?.id === fallbackCryptoData[0]?.id && 
                               Math.abs(cryptoData[0]?.price - fallbackCryptoData[0]?.price) < 0.1;
      
      setIsFallbackData(matchesFallback || error !== null);
    }
  }, [cryptoData, error]);

  // Calculate how many times we need to repeat items to fill the container
  useEffect(() => {
    const calculateRepeatCount = () => {
      if (!tickerContainerRef.current || !tickerContentRef.current) return;
      
      const containerWidth = tickerContainerRef.current.clientWidth;
      const contentWidth = tickerContentRef.current.scrollWidth;
      
      // We want to fill at least 2x the container width to ensure continuous scrolling
      const repeatsNeeded = Math.ceil((containerWidth * 2) / contentWidth);
      
      // Use at least 3 repeats or the calculated number, whichever is greater
      setRepeatCount(Math.max(3, repeatsNeeded));
    };

    // Initial calculation
    calculateRepeatCount();
    
    // Recalculate when window is resized
    const handleResize = () => {
      calculateRepeatCount();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cryptoData.length]);
  
  // Memoize refresh handler
  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple refreshes
    
    setRefreshing(true);
    setIsManualRefresh(true);
    setLastRefreshAttempt(Date.now());
    
    toast({
      title: "Refreshing Data",
      description: "Fetching latest crypto prices...",
    });
    
    try {
      await refreshData();
      
      if (!error) {
        toast({
          title: "Prices Updated",
          description: "Crypto prices have been refreshed",
        });
      }
    } catch (err) {
      toast({
        title: "Error Refreshing",
        description: "Could not update prices. Using cached data.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
      setIsManualRefresh(false);
    }
  }, [refreshing, refreshData, error]);
  
  // Optimized error handling
  useEffect(() => {
    if (error && isManualRefresh) {
      toast({
        title: "Error Loading Prices",
        description: "Using fallback data. Will retry automatically.",
        variant: "destructive"
      });
      setIsManualRefresh(false);
    }
  }, [error, isManualRefresh]);

  // Determine which data to display - optimized for performance
  const displayData = cryptoData.length > 0 ? cryptoData : fallbackCryptoData;

  // Add preconnect for improved CoinGecko API connection speed
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://api.coingecko.com';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Render the ticker items multiple times to ensure continuous scrolling
  const renderTickerItems = () => {
    // If loading with no data, show placeholders
    if (loading && displayData.length === 0) {
      return Array(5).fill(0).map((_, index) => (
        <div key={`placeholder-${index}`} className="crypto-ticker-item animate-pulse">
          <div className="h-4 w-10 bg-crypto-gray/30 rounded"></div>
          <div className="h-4 w-14 bg-crypto-gray/30 rounded"></div>
          <div className="h-3 w-12 bg-crypto-gray/20 rounded"></div>
        </div>
      ));
    }

    // Otherwise, render the actual data repeated
    return Array(repeatCount).fill(0).map((_, repeat) => (
      <React.Fragment key={`repeat-${repeat}`}>
        {displayData.map((crypto, index) => (
          <CryptoTickerItem 
            key={`${repeat}-${index}`}
            symbol={crypto.symbol}
            price={crypto.price}
            change={crypto.change}
          />
        ))}
      </React.Fragment>
    ));
  };

  return (
    <div 
      ref={tickerContainerRef}
      className="w-full bg-crypto-darkgray border-b border-crypto-gray overflow-hidden py-3"
    >
      <div ref={tickerContentRef} className="flex items-center animate-marquee-slow will-change-transform">
        <div className="font-display text-crypto-blue font-bold px-4 flex items-center gap-2">
          {loading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : error ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CryptoButton 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className="h-6 w-6 p-0 hover:bg-crypto-gray/20"
                  >
                    <RefreshCcw 
                      className={`h-4 w-4 cursor-pointer hover:text-crypto-blue/80 transition-colors ${refreshing ? 'animate-spin' : ''}`} 
                    />
                  </CryptoButton>
                </TooltipTrigger>
                <TooltipContent>
                  {refreshing ? "Refreshing prices..." : "Refresh crypto prices"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          CRYPTO
          {isFallbackData && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Info className="h-3.5 w-3.5 text-amber-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[180px]">
                    Using cached or fallback data due to connectivity issues. Click refresh to try again.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Render ticker items with calculated repetition */}
        {renderTickerItems()}
      </div>
    </div>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(CryptoTicker);
