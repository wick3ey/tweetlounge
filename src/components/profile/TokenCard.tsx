import React, { useState, useEffect } from 'react';
import { Token } from '@/utils/tokenService';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getTokenLogo, generateFallbackLogoUrl, cacheTokenLogo } from '@/services/storageService';

interface TokenCardProps {
  token: Token;
  solPrice?: number;
  isCompact?: boolean;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, solPrice, isCompact = false }) => {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Reset error state on new fetch
        setImageError(false);
        
        // Try to get a logo URL in this order: token.logo, token.logoURI, fallback
        if (token.logo) {
          const cachedLogo = await getTokenLogo(token.symbol, token.logo);
          setLogoUrl(cachedLogo);
          
          // If we got a fallback image but have a logo URL, try to force cache it
          if (cachedLogo === generateFallbackLogoUrl(token.symbol) && retryCount < 2) {
            console.log(`TokenCard: Force caching logo for ${token.symbol}: ${token.logo}`);
            const forceCachedLogo = await cacheTokenLogo(token.symbol, token.logo, true);
            if (forceCachedLogo && forceCachedLogo !== generateFallbackLogoUrl(token.symbol)) {
              setLogoUrl(forceCachedLogo);
            }
          }
        } else if (token.logoURI) {
          const cachedLogo = await getTokenLogo(token.symbol, token.logoURI);
          setLogoUrl(cachedLogo); 
          
          // Similar logic for logoURI
          if (cachedLogo === generateFallbackLogoUrl(token.symbol) && retryCount < 2) {
            console.log(`TokenCard: Force caching logoURI for ${token.symbol}: ${token.logoURI}`);
            const forceCachedLogo = await cacheTokenLogo(token.symbol, token.logoURI, true);
            if (forceCachedLogo && forceCachedLogo !== generateFallbackLogoUrl(token.symbol)) {
              setLogoUrl(forceCachedLogo);
            }
          }
        } else {
          setLogoUrl(generateFallbackLogoUrl(token.symbol));
        }
      } catch (error) {
        console.error(`Error fetching logo for ${token.symbol}:`, error);
        setImageError(true);
        setLogoUrl(generateFallbackLogoUrl(token.symbol));
      }
    };
    
    fetchLogo();
  }, [token.symbol, token.logo, token.logoURI, retryCount]);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.address);
    toast({
      title: "Address copied",
      description: "Token address copied to clipboard",
      duration: 3000,
    });
  };

  const formatAddress = (address: string): string => {
    if (address.length < 10) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (amount: string, decimals: number): string => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return '0';
    
    if (amountNum < 0.0001 && amountNum > 0) {
      return amountNum.toExponential(2);
    }
    
    return amountNum.toLocaleString(undefined, { 
      maximumFractionDigits: decimals > 6 ? 4 : decimals
    });
  };

  const formatUsdValue = (value?: string): string => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    } else if (num < 0.01 && num > 0) {
      return `<$0.01`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  const getSolUsdValue = (): string => {
    if (token.symbol === 'SOL' && solPrice && token.amount) {
      const solAmount = parseFloat(token.amount);
      const usdValue = solAmount * solPrice;
      return formatUsdValue(usdValue.toString());
    }
    return formatUsdValue(token.usdValue);
  };

  const getTokenLink = (): string => {
    if (token.symbol === 'UNKNOWN' || !token.symbol) {
      return token.dexScreenerUrl || token.explorerUrl || '#';
    }
    return token.explorerUrl || token.dexScreenerUrl || '#';
  };

  const handleImageError = () => {
    setImageError(true);
    
    // On error, increment retry count to trigger useEffect to try again with forceUpdate=true
    if (retryCount < 2 && (token.logo || token.logoURI)) {
      setRetryCount(prev => prev + 1);
    } else {
      setLogoUrl(generateFallbackLogoUrl(token.symbol));
    }
  };

  if (isCompact) {
    return (
      <div className="glass-card p-3 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={imageError ? generateFallbackLogoUrl(token.symbol) : (logoUrl || generateFallbackLogoUrl(token.symbol))} 
              alt={token.name || 'Token'} 
              className="w-6 h-6 rounded-full"
              onError={handleImageError}
            />
            <div>
              <h3 className="font-medium text-sm">{token.symbol || formatAddress(token.address)}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-sm">{formatBalance(token.amount, token.decimals)}</p>
            <p className="text-xs text-muted-foreground">{getSolUsdValue()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={imageError ? generateFallbackLogoUrl(token.symbol) : (logoUrl || generateFallbackLogoUrl(token.symbol))} 
            alt={token.name || 'Token'} 
            className="w-10 h-10 rounded-full"
            onError={handleImageError}
          />
          <div>
            <h3 className="font-medium">{token.name || 'Unknown Token'}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{token.symbol || formatAddress(token.address)}</span>
              {token.symbol === 'SOL' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">Native</span>
              )}
              {token.symbol === 'UNKNOWN' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-web3-muted/30 text-web3-muted-foreground">Unknown</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatBalance(token.amount, token.decimals)}</p>
          <p className="text-sm text-muted-foreground">{getSolUsdValue()}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={copyAddress}
          >
            <Copy className="h-3 w-3 mr-1" />
            {formatAddress(token.address)}
          </Button>
        </div>
        <a 
          href={getTokenLink()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-web3-primary hover:text-web3-primary/70 flex items-center"
        >
          View {token.symbol === 'UNKNOWN' ? 'on DEXScreener' : 'on Explorer'}
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </div>
    </div>
  );
};
