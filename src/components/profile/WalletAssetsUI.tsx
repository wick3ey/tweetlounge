
import { 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Card,
  CardHeader
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  ChevronDown,
  ChevronUp,
  ExternalLink, 
  BarChart3, 
  ArrowUpRight, 
  Loader, 
  RefreshCw,
  Settings,
  ListFilter,
  Grid3X3
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { Token } from "@/utils/tokenService";

interface TokenCardUIProps {
  token: Token;
  solPrice?: number;
}

export const TokenCardUI = ({ token, solPrice }: TokenCardUIProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if the token has a price/value
  const hasPrice = token.usdValue || (token.symbol === 'SOL' && solPrice);
  
  // Calculate the USD value for display
  const calculateUsdValue = (): string => {
    if (token.usdValue) {
      return `$${parseFloat(token.usdValue).toFixed(2)}`;
    }
    
    if (token.symbol === 'SOL' && solPrice) {
      const value = parseFloat(token.amount) * solPrice;
      return `$${value.toFixed(2)}`;
    }
    
    return 'N/A';
  };
  
  // Format token amount for display
  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    
    if (num < 0.001) {
      return '< 0.001';
    }
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    
    // For numbers with many decimal places, limit to 4 decimal places
    if (num < 1) {
      return num.toFixed(4);
    }
    
    // For whole numbers or numbers with few decimal places
    return num.toFixed(2);
  };
  
  // Generate dexscreener link for the token
  const getDexScreenerLink = (): string => {
    return `https://dexscreener.com/solana/${token.address}`;
  };
  
  // Generate a color gradient for the token
  const getTokenColor = (): string => {
    if (token.symbol === 'SOL') return 'bg-gradient-to-r from-purple-500 to-purple-800';
    if (token.symbol === 'USDC' || token.symbol === 'USDT') return 'bg-gradient-to-r from-green-500 to-green-700';
    if (token.symbol === 'BTC' || token.symbol === 'wBTC') return 'bg-gradient-to-r from-amber-500 to-amber-700';
    
    // Generate a consistent color based on the token address
    const hash = token.address.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const h = Math.abs(hash) % 360; // Hue between 0-359
    return `bg-gradient-to-r from-[hsl(${h},70%,40%)] to-[hsl(${h},70%,30%)]`;
  };
  
  return (
    <Card className="overflow-hidden interactive-card border-border/50 shadow-none">
      <div className="flex flex-col">
        <div 
          className="px-4 py-3 flex items-center space-x-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Avatar className={`h-10 w-10 ${getTokenColor()}`}>
            {(token.logoURI || token.logo) ? (
              <AvatarImage src={token.logoURI || token.logo} alt={token.name} />
            ) : (
              <AvatarFallback className="text-white font-medium">
                {token.symbol.substring(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className="font-medium leading-none mb-1">{token.name}</div>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {token.symbol} • {formatAmount(token.amount)}
            </div>
          </div>
          
          <div className="text-right">
            {hasPrice ? (
              <div>
                <div className="font-semibold">{calculateUsdValue()}</div>
                <div className="text-xs text-muted-foreground">
                  {token.priceChange24h !== undefined && (
                    <span className={token.priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                      {token.priceChange24h > 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.open(getDexScreenerLink(), '_blank')}
                className="text-xs h-8 bg-primary/5 hover:bg-primary/10"
              >
                View <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4 pt-0">
            <div className="text-xs text-muted-foreground space-y-2 p-2 rounded-md bg-background/50">
              <div className="flex justify-between">
                <span>Token Address</span>
                <span className="font-mono text-xs truncate max-w-[180px]">{token.address.substring(0, 8)}...{token.address.substring(token.address.length - 8)}</span>
              </div>
              
              <div className="border-t border-border/30 pt-2 mt-2 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-primary/20 hover:bg-primary/5"
                  onClick={() => window.open(getDexScreenerLink(), '_blank')}
                >
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Chart
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-primary/20 hover:bg-primary/5"
                >
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface WalletAssetsUIProps {
  tokens: Token[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  totalValue: string;
  onRefresh: () => void;
  solPrice: number | null;
  viewMode: string;
  setViewMode: (mode: string) => void;
}

export const WalletAssetsUI = ({
  tokens,
  loading,
  error,
  lastUpdated,
  totalValue,
  onRefresh,
  solPrice,
  viewMode,
  setViewMode
}: WalletAssetsUIProps) => {
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  
  // Filter tokens based on settings
  const filteredTokens = hideSmallBalances 
    ? tokens.filter(token => {
        const value = token.usdValue ? parseFloat(token.usdValue) : 0;
        return value > 1; // Hide tokens worth less than $1
      })
    : tokens;
  
  return (
    <div className="glass-card p-4 my-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            Portfolio Overview
            {lastUpdated && (
              <HoverCard>
                <HoverCardTrigger>
                  <span className="text-xs text-muted-foreground whitespace-nowrap cursor-help">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 glass-card border-border/60">
                  <div className="text-sm space-y-2">
                    <p>Data refreshed at {lastUpdated.toLocaleTimeString()}</p>
                    <p className="text-xs text-muted-foreground">Prices and balances are updated periodically from blockchain data and may not reflect the most recent transactions.</p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold gradient-text">{totalValue}</span>
            <span className="text-xs text-muted-foreground">Total Value</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Refresh tokens"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)}>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0">
              <Grid3X3 className="h-4 w-4" />
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
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm bg-red-500/10 text-red-500 rounded-md">
          {error}
        </div>
      )}
      
      {tokens.length === 0 && !loading ? (
        <div className="text-center py-10">
          <div className="bg-card/20 backdrop-blur-md rounded-lg p-8 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <p className="text-lg font-display font-medium mb-2">No tokens found</p>
            <p className="text-muted-foreground mb-4">This wallet doesn't have any tokens or there was an error fetching the data.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <>
          {loading && tokens.length === 0 ? (
            <div className="flex justify-center items-center py-16">
              <div className="flex flex-col items-center">
                <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Loading wallet assets...</p>
              </div>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
              {filteredTokens.map((token, index) => (
                <TokenCardUI 
                  key={`${token.address}-${index}`} 
                  token={token} 
                  solPrice={solPrice || undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
