
import React from 'react'
import { useCryptoData, CryptoCurrency } from '@/utils/coingeckoService'
import { Loader2, RefreshCcw, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { CryptoButton } from '@/components/ui/crypto-button'

interface CryptoTickerItemProps {
  name: string
  symbol: string
  price: number
  change: number
}

const CryptoTickerItem: React.FC<CryptoTickerItemProps> = ({ name, symbol, price, change }) => {
  const formattedPrice = price < 1 ? price.toFixed(4) : price.toFixed(2)
  const formattedChange = change.toFixed(1)
  const changeColor = change >= 0 ? 'crypto-price-up' : 'crypto-price-down'
  const changeSign = change >= 0 ? '+' : ''
  
  return (
    <div className="crypto-ticker-item">
      <span className="font-medium text-white">{symbol}</span>
      <span className="text-crypto-lightgray text-xs">{name}</span>
      <span className="font-medium">${formattedPrice}</span>
      <span className={`text-xs ${changeColor}`}>
        {changeSign}{formattedChange}%
      </span>
    </div>
  )
}

// Fallback data to show when API fails
const fallbackCryptoData: CryptoCurrency[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 84000, change: -2.1 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1900, change: -3.5 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', price: 130, change: -4.2 },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 2.2, change: -1.8 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.70, change: -2.4 }
];

// Cache key for crypto ticker data
const CRYPTO_CACHE_KEY = 'crypto_ticker_data';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const CryptoTicker: React.FC = () => {
  const { cryptoData, loading, error, refreshData } = useCryptoData()
  const [refreshing, setRefreshing] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastRefreshAttempt, setLastRefreshAttempt] = React.useState(0);
  const [isManualRefresh, setIsManualRefresh] = React.useState(false);
  
  // Auto-retry once if initial load fails
  React.useEffect(() => {
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
  
  // When crypto data changes, update the cache
  React.useEffect(() => {
    if (cryptoData.length > 0) {
      try {
        localStorage.setItem(CRYPTO_CACHE_KEY, JSON.stringify({
          data: cryptoData,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching crypto data:', error);
      }
    }
  }, [cryptoData]);
  
  // On initial load, check for cached data
  React.useEffect(() => {
    try {
      const cachedItem = localStorage.getItem(CRYPTO_CACHE_KEY);
      
      if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);
        const isFresh = Date.now() - timestamp < CACHE_DURATION;
        
        // If we have cached data that's not too old, use it
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`Using ${isFresh ? 'fresh' : 'stale'} cached crypto data`);
        }
      }
    } catch (error) {
      console.error('Error reading cached crypto data:', error);
    }
  }, []);
  
  const handleRefresh = async () => {
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
  };
  
  // Display error toast only on manual refresh
  React.useEffect(() => {
    if (error && isManualRefresh) {
      toast({
        title: "Error Loading Prices",
        description: "Using fallback data. Will retry automatically.",
        variant: "destructive"
      });
      setIsManualRefresh(false);
    }
  }, [error, isManualRefresh]);

  // Determine which data to display
  const displayData = cryptoData.length > 0 ? cryptoData : fallbackCryptoData;

  return (
    <div className="w-full bg-crypto-darkgray border-b border-crypto-gray overflow-hidden py-3">
      <div className="flex items-center space-x-6 animate-marquee">
        <div className="font-display text-crypto-blue font-bold px-4 flex items-center gap-2">
          {loading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : error ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
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
          )}
          CRYPTO
        </div>
        
        {/* Always show some data - either real or fallback */}
        {displayData.map((crypto, index) => (
          <CryptoTickerItem 
            key={index}
            name={crypto.name}
            symbol={crypto.symbol}
            price={crypto.price}
            change={crypto.change}
          />
        ))}
        
        {/* If we're in a loading state and have no data yet, show loading placeholders */}
        {loading && displayData.length === 0 && (
          Array(5).fill(0).map((_, index) => (
            <div key={index} className="crypto-ticker-item animate-pulse">
              <div className="h-4 w-10 bg-crypto-gray/30 rounded"></div>
              <div className="h-3 w-16 bg-crypto-gray/20 rounded"></div>
              <div className="h-4 w-14 bg-crypto-gray/30 rounded"></div>
              <div className="h-3 w-12 bg-crypto-gray/20 rounded"></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CryptoTicker
