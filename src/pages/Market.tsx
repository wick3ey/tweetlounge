
import React from 'react';
import { useMarketData } from '@/services/marketService';
import { TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';

const TokenCardSkeleton = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-5 w-1/3" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

const formatPrice = (price: number) => {
  if (price < 0.001) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatPercentage = (percent: number) => {
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const TokenCard = ({ token, type }: { token: any, type: 'gainer' | 'loser' | 'hot' }) => {
  const isHot = type === 'hot';
  const isPriceUp = !isHot && token.variation24h > 0;
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg border-t-4 hover:translate-y-[-2px]" 
      style={{ 
        borderTopColor: type === 'gainer' 
          ? 'rgb(34, 197, 94)' 
          : type === 'loser' 
            ? 'rgb(239, 68, 68)' 
            : 'rgb(59, 130, 246)' 
      }}>
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-offset-2" style={{ 
              ringColor: type === 'gainer' 
                ? 'rgba(34, 197, 94, 0.3)' 
                : type === 'loser' 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : 'rgba(59, 130, 246, 0.3)' 
            }}>
              <AvatarImage src={token.logoUrl} alt={token.name} />
              <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900">
                {token.symbol.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-base leading-tight">{token.symbol}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[150px]">{token.name}</div>
            </div>
          </div>
          <Badge variant={type === 'gainer' ? 'success' : type === 'loser' ? 'destructive' : 'default'} className="ml-auto">
            #{token.rank}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Exchange</div>
            <div className="font-medium truncate">{token.exchange}</div>
          </div>
          
          {!isHot ? (
            <>
              <div>
                <div className="text-muted-foreground text-xs">Price</div>
                <div className="font-medium">${formatPrice(token.price)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">24h Change</div>
                <div className={`font-medium ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercentage(token.variation24h)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-muted-foreground text-xs">Created</div>
                <div className="font-medium text-xs">{new Date(token.creationTime).toLocaleDateString()}</div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

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
      <div className="container py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">Crypto Market</h1>
            <p className="text-muted-foreground">
              Latest market movements, top gainers, losers, and hot new tokens
            </p>
          </div>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 self-start">
            <RefreshCw className="h-4 w-4" /> 
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {marketData && !loading && (
          <div className="text-sm text-muted-foreground mb-4">
            Last updated: {formatTime(marketData.lastUpdated)}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-bold">Top Gainers</h2>
            </div>
            
            {loading ? (
              <TokenCardSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {marketData?.gainers?.slice(0, 8).map((token) => (
                  <TokenCard key={token.address} token={token} type="gainer" />
                ))}
              </div>
            )}
          </section>
          
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-bold">Top Losers</h2>
            </div>
            
            {loading ? (
              <TokenCardSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {marketData?.losers?.slice(0, 8).map((token) => (
                  <TokenCard key={token.address} token={token} type="loser" />
                ))}
              </div>
            )}
          </section>
          
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Hot</h2>
            </div>
            
            {loading ? (
              <TokenCardSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {marketData?.hotPools?.slice(0, 8).map((token) => (
                  <TokenCard key={token.poolAddress} token={token} type="hot" />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Market;
