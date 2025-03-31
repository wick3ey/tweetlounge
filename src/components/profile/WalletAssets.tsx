
import { useEffect, useState, useRef } from 'react';
import { fetchWalletTokens, Token } from '@/utils/tokenService';
import { WalletAssetsUI } from '@/components/profile/WalletAssetsUI';
import { useToast } from '@/components/ui/use-toast';

interface WalletAssetsProps {
  solanaAddress: string;
}

const WalletAssets = ({ solanaAddress }: WalletAssetsProps) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<string>("grid");
  const [totalValue, setTotalValue] = useState<string>("$0.00");
  const cacheKey = useRef(`wallet-tokens-${solanaAddress}`);
  const { toast } = useToast();
  
  // Use cached data from localStorage first for instant display
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(cacheKey.current);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (parsedData.tokens && Array.isArray(parsedData.tokens)) {
          setTokens(parsedData.tokens);
          if (parsedData.solPrice) {
            setSolPrice(parsedData.solPrice);
          }
          if (parsedData.lastUpdated) {
            setLastUpdated(new Date(parsedData.lastUpdated));
          }
          calculateTotalWalletValue(parsedData.tokens, parsedData.solPrice);
          setLoading(false);
          
          // Still fetch fresh data after using cache
          setTimeout(() => fetchTokens(true), 100);
        }
      } else {
        fetchTokens(false);
      }
    } catch (err) {
      console.error('Error loading cached token data:', err);
      fetchTokens(false);
    }
  }, [solanaAddress]);
  
  const fetchTokens = async (isBackground = false) => {
    if (!solanaAddress) return;
    
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    
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

        // Calculate the total wallet value
        calculateTotalWalletValue(sortedTokens, response.solPrice);
        
        // Cache the response in localStorage
        try {
          localStorage.setItem(cacheKey.current, JSON.stringify({
            tokens: sortedTokens,
            solPrice: response.solPrice,
            lastUpdated: new Date().toISOString()
          }));
        } catch (err) {
          console.error('Error caching token data:', err);
        }
      } else {
        setTokens([]);
        setTotalValue("$0.00");
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens. Please try again later.');
      if (!isBackground) {
        toast({
          title: "Error loading assets",
          description: "Could not load wallet assets. Using cached data if available.",
          variant: "destructive"
        });
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };
  
  const handleRefresh = () => {
    fetchTokens(false);
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
