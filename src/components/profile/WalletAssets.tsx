
import { useEffect, useState } from 'react';
import { fetchWalletTokens, Token } from '@/utils/tokenService';
import { WalletAssetsUI } from '@/components/profile/WalletAssetsUI';

interface WalletAssetsProps {
  solanaAddress: string;
}

// Cache keys and durations
const WALLET_CACHE_KEY_PREFIX = 'wallet_tokens_';
const WALLET_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const WalletAssets = ({ solanaAddress }: WalletAssetsProps) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<string>("grid"); // Default to grid view
  const [totalValue, setTotalValue] = useState<string>("$0.00");
  
  const cacheKey = `${WALLET_CACHE_KEY_PREFIX}${solanaAddress}`;
  
  // Function to check for cached wallet data
  const checkCachedData = () => {
    try {
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (cachedItem) {
        const { data, timestamp, price, total } = JSON.parse(cachedItem);
        const isFresh = Date.now() - timestamp < WALLET_CACHE_DURATION;
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`Using ${isFresh ? 'fresh' : 'stale'} cached wallet data`);
          setTokens(data);
          if (price) setSolPrice(price);
          if (total) setTotalValue(total);
          
          // If the cache is fresh, we can show it as not loading
          if (isFresh) {
            setLoading(false);
            setLastUpdated(new Date(timestamp));
            
            // Still fetch in background after a delay if cache is getting stale
            if (Date.now() - timestamp > WALLET_CACHE_DURATION / 2) {
              setTimeout(() => {
                console.log("Cache is getting stale, fetching fresh wallet data in background");
                fetchTokens();
              }, 1000); // Small delay to allow UI to render first
            }
            
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error reading cached wallet data:', error);
      return false;
    }
  };
  
  const fetchTokens = async () => {
    if (!solanaAddress) return;
    
    setError(null);
    // Only show loading if we have no cached data
    if (tokens.length === 0) {
      setLoading(true);
    }
    
    try {
      const response = await fetchWalletTokens(solanaAddress);
      if (response.tokens.length > 0) {
        // Sort tokens: SOL first, then by value (if available), then by name
        const sortedTokens = response.tokens.sort((a, b) => {
          // SOL token always comes first
          if (a.symbol === 'SOL') return -1;
          if (b.symbol === 'SOL') return 1;
          
          // Then sort by USD value if available
          const aValue = a.usdValue ? parseFloat(a.usdValue) : 0;
          const bValue = b.usdValue ? parseFloat(b.usdValue) : 0;
          
          if (aValue !== bValue) return bValue - aValue;
          
          // Finally sort by name
          return a.name.localeCompare(b.name);
        });
        
        setTokens(sortedTokens);
        if (response.solPrice) {
          setSolPrice(response.solPrice);
        }

        // Calculate the total wallet value here
        calculateTotalWalletValue(sortedTokens, response.solPrice);
        
        // Cache the wallet data
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: sortedTokens,
            timestamp: Date.now(),
            price: response.solPrice,
            total: totalValue
          }));
        } catch (cacheError) {
          console.error('Error caching wallet data:', cacheError);
        }
      } else {
        setTokens([]);
        setTotalValue("$0.00");
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens. Please try again later.');
      
      // If we have cached data, we can continue showing it
      if (tokens.length === 0) {
        checkCachedData();
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // First check for cached data
    const hasCachedData = checkCachedData();
    
    // If no valid cached data, fetch new data
    if (!hasCachedData) {
      fetchTokens();
    }
  }, [solanaAddress]);
  
  const handleRefresh = () => {
    fetchTokens();
  };
  
  // Calculate total wallet value in USD
  const calculateTotalWalletValue = (tokens: Token[], solPrice: number | undefined): void => {
    if (!tokens.length) {
      setTotalValue("$0.00");
      return;
    }
    
    const total = tokens.reduce((sum, token) => {
      // Add USD value if available
      if (token.usdValue) {
        const tokenValue = parseFloat(token.usdValue);
        if (!isNaN(tokenValue)) {
          return sum + tokenValue;
        }
      }
      
      // For SOL token, calculate value from SOL price
      if (token.symbol === 'SOL' && solPrice) {
        const solAmount = parseFloat(token.amount);
        if (!isNaN(solAmount)) {
          return sum + (solAmount * solPrice);
        }
      }
      
      return sum;
    }, 0);
    
    // Format total with appropriate suffix
    if (total >= 1000000) {
      setTotalValue(`$${(total / 1000000).toFixed(2)}M`);
    } else if (total >= 1000) {
      setTotalValue(`$${(total / 1000).toFixed(2)}K`);
    } else {
      setTotalValue(`$${total.toFixed(2)}`);
    }
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode: string) => {
    if (mode) {
      setViewMode(mode);
    }
  };
  
  return (
    <WalletAssetsUI
      tokens={tokens}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      totalValue={totalValue}
      onRefresh={handleRefresh}
      solPrice={solPrice}
      viewMode={viewMode}
      setViewMode={handleViewModeChange}
    />
  );
};

export default WalletAssets;
