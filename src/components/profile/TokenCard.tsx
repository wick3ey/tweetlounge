import React from 'react';
import { Token } from '@/utils/tokenService';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface TokenCardProps {
  token: Token;
  solPrice?: number;
  isCompact?: boolean;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, solPrice, isCompact = false }) => {
  const { toast } = useToast();

  const copyAddress = () => {
    navigator.clipboard.writeText(token.address);
    toast({
      title: "Address copied",
      description: "Token address copied to clipboard",
      duration: 3000,
    });
  };

  // Format address to show first 4 and last 5 chars
  const formatAddress = (address: string): string => {
    if (address.length < 10) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };
  
  // Format balance with appropriate commas/decimals
  const formatBalance = (amount: string, decimals: number): string => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return '0';
    
    // For very small numbers, use scientific notation
    if (amountNum < 0.0001 && amountNum > 0) {
      return amountNum.toExponential(2);
    }
    
    // Otherwise use toLocaleString
    return amountNum.toLocaleString(undefined, { 
      maximumFractionDigits: decimals > 6 ? 4 : decimals
    });
  };

  // Format USD value
  const formatUsdValue = (value?: string): string => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    
    // Different formatting based on the value
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

  // Calculate SOL value for the native SOL token
  const getSolUsdValue = (): string => {
    if (token.symbol === 'SOL' && solPrice && token.amount) {
      const solAmount = parseFloat(token.amount);
      const usdValue = solAmount * solPrice;
      return formatUsdValue(usdValue.toString());
    }
    return formatUsdValue(token.usdValue);
  };
  
  // Get token logo or use a placeholder
  const getTokenLogo = (): string => {
    if (token.logo) return token.logo;
    if (token.symbol === 'SOL') return 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
    return `https://placehold.co/40x40/8b5cf6/ffffff?text=${token.symbol?.substring(0,2) || '??'}`;
  };
  
  // Determine which link to use
  const getTokenLink = (): string => {
    if (token.symbol === 'UNKNOWN' || !token.symbol) {
      return token.dexScreenerUrl || token.explorerUrl || '#';
    }
    return token.explorerUrl || token.dexScreenerUrl || '#';
  };

  if (isCompact) {
    return (
      <div className="glass-card p-3 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={getTokenLogo()} 
              alt={token.name || 'Token'} 
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/8b5cf6/ffffff?text=${token.symbol?.substring(0,2) || '??'}`;
              }}
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
            src={getTokenLogo()} 
            alt={token.name || 'Token'} 
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/40x40/8b5cf6/ffffff?text=${token.symbol?.substring(0,2) || '??'}`;
            }}
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
