
import React, { useState } from 'react';
import { useMarketData } from '@/services/marketService';
import { TrendingUp, TrendingDown, Zap, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';

const TokenCardSkeleton = () => (
  <div className="p-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center justify-between p-2 border-b border-gray-800 animate-pulse">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32 mt-1" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
      </div>
    ))}
  </div>
);

const formatPrice = (price: number) => {
  if (isNaN(price)) return "N/A";
  
  // For very small numbers (less than 0.0001)
  if (price < 0.0001 && price > 0) {
    return price.toFixed(6);
  }
  
  // For small numbers (less than 1)
  if (price < 1) {
    return price.toFixed(4);
  }
  
  // For medium numbers (less than 1000)
  if (price < 1000) {
    return price.toFixed(2);
  }
  
  // For large numbers
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatPercentage = (percent: number) => {
  if (isNaN(percent)) return "0%";
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const TokenRow = ({ token, type }: { token: any, type: 'gainer' | 'loser' | 'hot' }) => {
  const isHot = type === 'hot';
  const isPriceUp = !isHot ? token.variation24h > 0 : false;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-9 w-9 border-2" style={{ 
            borderColor: type === 'gainer' 
              ? 'rgba(34, 197, 94, 0.3)' 
              : type === 'loser' 
                ? 'rgba(239, 68, 68, 0.3)' 
                : 'rgba(59, 130, 246, 0.3)' 
          }}>
            <AvatarImage src={token.logoUrl} alt={token.symbol} />
            <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-700 text-xs">
              {token.symbol.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <Badge 
            variant={type === 'gainer' ? 'success' : type === 'loser' ? 'destructive' : 'default'} 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
          >
            {token.rank}
          </Badge>
        </div>
        <div>
          <div className="font-semibold text-sm flex items-center">
            {token.symbol}
            <span className="text-xs text-muted-foreground ml-2">{token.name.length > 15 ? token.name.substring(0, 15) + '...' : token.name}</span>
          </div>
          <div className="text-xs text-muted-foreground">{token.exchange}</div>
        </div>
      </div>
      
      <div className="text-right">
        {!isHot ? (
          <>
            <div className="font-medium text-sm">${formatPrice(token.price)}</div>
            <div className={`text-xs ${isPriceUp ? 'text-green-500' : 'text-red-500'} font-medium`}>
              {formatPercentage(token.variation24h)}
            </div>
          </>
        ) : (
          <div className="text-xs text-blue-400 font-medium">
            Created: {new Date(token.creationTime).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

const MarketSection = ({ 
  title, 
  icon: Icon, 
  tokens, 
  type, 
  loading, 
  accentColor 
}: { 
  title: string, 
  icon: any, 
  tokens: any[], 
  type: 'gainer' | 'loser' | 'hot', 
  loading: boolean,
  accentColor: string
}) => (
  <div className="rounded-xl border border-gray-800 bg-black/70 backdrop-blur-sm overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/70" style={{ backgroundColor: `${accentColor}20` }}>
      <Icon className="h-5 w-5" style={{ color: accentColor }} />
      <h2 className="text-base font-bold">{title}</h2>
    </div>
    
    <div className="max-h-[460px] overflow-y-auto crypto-scrollbar">
      {loading ? (
        <TokenCardSkeleton />
      ) : tokens && tokens.length > 0 ? (
        tokens.map((token) => (
          <TokenRow key={type === 'hot' ? token.poolAddress : token.address} token={token} type={type} />
        ))
      ) : (
        <div className="p-6 text-center text-muted-foreground">No {title.toLowerCase()} to display</div>
      )}
    </div>
  </div>
);

const Market: React.FC = () => {
  const { marketData, loading, error, refreshData } = useMarketData();
  const { toast } = useToast();
  
  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Refreshing market data",
      description: "Getting the latest crypto market information"
    });
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">
              Crypto Market Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Latest movements, gainers, losers, and hot new tokens
            </p>
          </div>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 self-start">
            <RefreshCw className="h-4 w-4" /> 
            <span className="hidden sm:inline">Refresh Markets</span>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 mb-6">
            <h3 className="text-red-500 font-semibold mb-1">Error Loading Data</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {marketData && !loading && (
          <div className="text-sm text-muted-foreground mb-4">
            Last updated: {formatTime(marketData.lastUpdated)}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <MarketSection
            title="Top Gainers"
            icon={TrendingUp}
            tokens={marketData?.gainers || []}
            type="gainer"
            loading={loading}
            accentColor="#22c55e" // Green
          />
          
          <MarketSection
            title="Top Losers"
            icon={TrendingDown}
            tokens={marketData?.losers || []}
            type="loser"
            loading={loading}
            accentColor="#ef4444" // Red
          />
          
          <MarketSection
            title="Hot"
            icon={Zap}
            tokens={marketData?.hotPools || []}
            type="hot"
            loading={loading}
            accentColor="#3b82f6" // Blue
          />
        </div>
      </div>
    </Layout>
  );
};

export default Market;
