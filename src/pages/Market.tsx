
import React from 'react';
import { useMarketData } from '@/services/marketService';
import { TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/components/layout/Layout';

const TokenCardSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const formatPrice = (price: number) => {
  if (price < 0.001) return price.toExponential(2);
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

const TokenTable: React.FC<{ 
  data: any[], 
  type: 'gainers' | 'losers' | 'hotPools',
  isLoading: boolean
}> = ({ data, type, isLoading }) => {
  if (isLoading) {
    return <TokenCardSkeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  const isHotPool = type === 'hotPools';

  return (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>Exchange</TableHead>
            {!isHotPool && <TableHead>Price</TableHead>}
            {!isHotPool && <TableHead>24h Change</TableHead>}
            {isHotPool && <TableHead>Pool</TableHead>}
            {isHotPool && <TableHead>Created</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((token) => (
            <TableRow key={isHotPool ? token.poolAddress : token.address}>
              <TableCell>#{token.rank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={token.logoUrl} alt={token.name} />
                    <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[100px]">{token.name}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{token.exchange}</TableCell>
              {!isHotPool && (
                <TableCell>${formatPrice(token.price)}</TableCell>
              )}
              {!isHotPool && (
                <TableCell>
                  <Badge variant={token.variation24h > 0 ? "success" : "destructive"} className="font-mono">
                    {formatPercentage(token.variation24h)}
                  </Badge>
                </TableCell>
              )}
              {isHotPool && (
                <TableCell>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px] inline-block">
                    {token.poolAddress.substring(0, 10)}...
                  </span>
                </TableCell>
              )}
              {isHotPool && (
                <TableCell>{formatTime(token.creationTime)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Crypto Market</h1>
            <p className="text-muted-foreground">
              Latest market movements, top gainers, losers, and hot pools
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
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
          <div className="text-sm text-muted-foreground mb-6">
            Last updated: {formatTime(marketData.lastUpdated)}
          </div>
        )}

        <Tabs defaultValue="gainers">
          <TabsList className="mb-6">
            <TabsTrigger value="gainers" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Top Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4" /> Top Losers
            </TabsTrigger>
            <TabsTrigger value="hotPools" className="flex items-center gap-1">
              <Zap className="h-4 w-4" /> Hot Pools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gainers">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Top Gainers</CardTitle>
                <CardDescription>
                  Tokens with the highest price increase in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenTable 
                  data={marketData?.gainers || []} 
                  type="gainers" 
                  isLoading={loading} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="losers">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Top Losers</CardTitle>
                <CardDescription>
                  Tokens with the largest price decrease in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenTable 
                  data={marketData?.losers || []} 
                  type="losers" 
                  isLoading={loading} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hotPools">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Hot Pools</CardTitle>
                <CardDescription>
                  Recently created pools gaining significant attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenTable 
                  data={marketData?.hotPools || []} 
                  type="hotPools" 
                  isLoading={loading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Market;
