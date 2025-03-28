
import { useEffect, useState } from 'react';
import { fetchWalletTokens, Token } from '@/utils/tokenService';
import { Loader, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TokenCard } from '@/components/profile/TokenCard';
import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [isCompactView, setIsCompactView] = useState(false);
  
  const fetchTokens = async () => {
    if (!solanaAddress) return;
    
    setLoading(true);
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
      } else {
        setTokens([]);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTokens();
  }, [solanaAddress]);
  
  const handleRefresh = () => {
    fetchTokens();
  };
  
  // Calculate total wallet value in USD
  const calculateTotalValue = (): string => {
    if (!tokens.length) return '$0.00';
    
    const total = tokens.reduce((sum, token) => {
      // Add USD value if available
      if (token.usdValue) {
        return sum + parseFloat(token.usdValue);
      }
      
      // For SOL token, calculate value from SOL price
      if (token.symbol === 'SOL' && solPrice) {
        const solAmount = parseFloat(token.amount);
        return sum + (solAmount * solPrice);
      }
      
      return sum;
    }, 0);
    
    // Format total with appropriate suffix
    if (total >= 1000000) {
      return `$${(total / 1000000).toFixed(2)}M`;
    } else if (total >= 1000) {
      return `$${(total / 1000).toFixed(2)}K`;
    } else {
      return `$${total.toFixed(2)}`;
    }
  };
  
  if (loading && tokens.length === 0) {
    return (
      <div className="glass-card p-6 text-center my-4">
        <Loader className="h-8 w-8 animate-spin text-web3-primary mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading wallet assets...</p>
      </div>
    );
  }
  
  return (
    <div className="glass-card p-4 my-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            Portfolio Overview
            {lastUpdated && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold gradient-text">{calculateTotalValue()}</span>
            <span className="text-xs text-muted-foreground">Total Value</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Refresh tokens"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)}>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Toggle
            pressed={isCompactView}
            onPressedChange={setIsCompactView}
            aria-label="Toggle compact view"
            className="h-8 w-8 p-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19H2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h13.3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />
              <path d="M22 5H9" />
              <path d="M18 19l4-8" />
              <path d="M22 19l-4-8" />
            </svg>
          </Toggle>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm bg-red-500/10 text-red-500 rounded-md">
          {error}
        </div>
      )}
      
      {tokens.length === 0 && !loading ? (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No tokens found in this wallet</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
          {tokens.map((token, index) => (
            <TokenCard 
              key={`${token.address}-${index}`} 
              token={token} 
              solPrice={solPrice || undefined}
              isCompact={isCompactView}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletAssets;
