import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, BarChart2, TrendingUp, TrendingDown, Search, 
  Info, ArrowUp, ArrowDown, RefreshCw, Eye, ExternalLink, Image
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchSolanaStats, 
  fetchTopTokens, 
  fetchHotPools, 
  fetchRecentTokens,
  fetchTokenMetadata,
  type SolanaMarketStats, 
  type PoolInfo,
  type TokenInfo
} from '@/services/marketService';

const formatNumber = (num: number, digits = 2) => {
  if (num === undefined || num === null) return 'N/A';
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(digits)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(digits)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(digits)}K`;
  } else {
    return `$${num.toFixed(digits)}`;
  }
};

const formatPercent = (percent: number) => {
  if (percent === undefined || percent === null) return 'N/A';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const shortenAddress = (address: string) => {
  if (!address) return 'N/A';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

const MarketOverview = ({ stats }: { stats: SolanaMarketStats | null }) => {
  if (!stats) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Solana Market Overview</CardTitle>
          <CardDescription>Loading market data...</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-800/50 animate-pulse rounded-lg"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-black/60">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center">
            <LineChart className="h-5 w-5 mr-2 text-crypto-blue" />
            Solana Market Overview
          </CardTitle>
          <Badge variant="outline" className="py-1 bg-purple-600/20 text-purple-400 border-purple-700/50">
            Solana Only
          </Badge>
        </div>
        <CardDescription>
          Real-time market data from the Solana blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Value Locked" 
          value={formatNumber(stats.tvl)} 
          icon={<LineChart className="h-4 w-4 text-green-400" />}
          className="bg-green-900/10 border-green-800/20"
        />
        <StatCard 
          title="Token Count" 
          value={stats.tokenCount?.toLocaleString() || 'N/A'} 
          icon={<BarChart2 className="h-4 w-4 text-blue-400" />}
          className="bg-blue-900/10 border-blue-800/20"
        />
        <StatCard 
          title="Pool Count" 
          value={stats.poolCount?.toLocaleString() || 'N/A'} 
          icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
          className="bg-purple-900/10 border-purple-800/20"
        />
        <StatCard 
          title="Exchange Count" 
          value={stats.exchangeCount?.toLocaleString() || 'N/A'} 
          icon={<TrendingDown className="h-4 w-4 text-orange-400" />}
          className="bg-orange-900/10 border-orange-800/20"
        />
        <StatCard 
          title="Chain ID" 
          value={stats.id || 'N/A'} 
          icon={<Info className="h-4 w-4 text-yellow-400" />}
          className="bg-yellow-900/10 border-yellow-800/20"
        />
        <StatCard 
          title="Website" 
          value={<a href={stats.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center">
            {stats.website?.replace('https://', '').replace('http://', '')}
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>} 
          icon={<Search className="h-4 w-4 text-pink-400" />}
          className="bg-pink-900/10 border-pink-800/20"
        />
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Data provided by DEXTools API
      </CardFooter>
    </Card>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  className 
}: { 
  title: string; 
  value: string | React.ReactNode; 
  icon: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`flex flex-col p-4 rounded-lg border ${className}`}>
      <div className="flex items-center mb-2">
        <div className="mr-2">{icon}</div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
};

const TopTokensTable = ({ 
  data, 
  type 
}: { 
  data: PoolInfo[] | undefined;
  type: 'gainers' | 'losers';
}) => {
  const { toast } = useToast();
  
  if (!data || data.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">
          {data === undefined ? 'Loading data...' : 'No data available'}
        </div>
      </div>
    );
  }

  const pools = Array.isArray(data) ? data : [];

  const handleRowClick = (token: PoolInfo) => {
    if (token?.mainToken?.address) {
      window.open(`https://solscan.io/token/${token.mainToken.address}`, '_blank');
    } else {
      toast({
        title: "Token Error",
        description: "Could not find token address",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Change (24h)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.map((token, index) => (
            <TableRow 
              key={token.mainToken?.address || index} 
              className="border-gray-800 cursor-pointer hover:bg-gray-900/50"
              onClick={() => handleRowClick(token)}
            >
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={token.mainToken?.logo} alt={token.mainToken?.name} />
                    <AvatarFallback className="text-xs bg-gray-800 text-gray-400">
                      {token.mainToken?.symbol?.substring(0, 2) || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{token.mainToken?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{token.mainToken?.symbol}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">{token.price ? formatNumber(token.price, 4) : 'N/A'}</TableCell>
              <TableCell className="text-right">
                <span className={token.variation24h === undefined ? '' : (token.variation24h > 0 ? 'text-green-500' : 'text-red-500')}>
                  {token.variation24h === undefined ? 'N/A' : (
                    <div className="flex items-center justify-end">
                      {token.variation24h > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                      {formatPercent(token.variation24h)}
                    </div>
                  )}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="text-center">
        <Button variant="outline" className="text-xs border-gray-800">
          View All {type === 'gainers' ? 'Gainers' : 'Losers'}
        </Button>
      </div>
    </div>
  );
};

const transformTokensForTable = (tokens: TokenInfo[] | undefined): any[] => {
  if (!tokens) {
    console.error("Tokens data is undefined");
    return [];
  }
  
  if (!Array.isArray(tokens)) {
    console.error("Invalid tokens data:", tokens);
    return [];
  }
  
  return tokens.map((token, index) => ({
    id: token.address || `token-${index}`,
    name: token.name || 'Unknown',
    symbol: token.symbol || 'N/A',
    created: token.creationTime ? formatDate(token.creationTime) : 'N/A',
    address: token.address || 'N/A',
    logo: token.logo || '',
  }));
};

const RecentTokensList = ({ tokens }: { tokens: TokenInfo[] | undefined }) => {
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const formattedTokens = transformTokensForTable(safeTokens);
  
  if (!tokens) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">Loading recent tokens...</div>
      </div>
    );
  }
  
  if (formattedTokens.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">No recent tokens found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black">
            <TableHead>Token</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formattedTokens.map((token) => (
            <TableRow key={token.id} className="border-gray-800 hover:bg-gray-900/50">
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={token.logo} alt={token.name} />
                    <AvatarFallback className="text-xs bg-gray-800 text-gray-400">
                      {token.symbol?.substring(0, 2) || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{token.name}</span>
                </div>
              </TableCell>
              <TableCell>{token.symbol}</TableCell>
              <TableCell>{token.created}</TableCell>
              <TableCell>
                <span className="text-xs text-gray-400">{shortenAddress(token.address)}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 text-xs border-gray-800"
                    onClick={() => window.open(`https://solscan.io/token/${token.address}`, '_blank')}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const HotPoolsList = ({ pools }: { pools: PoolInfo[] | undefined }) => {
  const { toast } = useToast();
  const safePools = Array.isArray(pools) ? pools : [];
  const [poolMetadata, setPoolMetadata] = useState<{[key: string]: TokenInfo | null}>({});
  
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!safePools || safePools.length === 0) return;
      
      const metadataResults: {[key: string]: TokenInfo | null} = {};
      
      for (const pool of safePools) {
        if (pool.mainToken?.address && !poolMetadata[pool.mainToken.address]) {
          try {
            const metadata = await fetchTokenMetadata(pool.mainToken.address);
            if (metadata) {
              metadataResults[pool.mainToken.address] = metadata;
            }
          } catch (error) {
            console.error(`Error fetching metadata for ${pool.mainToken.address}:`, error);
          }
        }
      }
      
      setPoolMetadata(prev => ({...prev, ...metadataResults}));
    };
    
    fetchMetadata();
  }, [safePools]);
  
  if (!pools) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">Loading hot pools...</div>
      </div>
    );
  }
  
  if (safePools.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">No hot pools found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>DEX</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safePools.map((pool, index) => {
            const tokenMetadata = pool.mainToken?.address ? poolMetadata[pool.mainToken.address] : null;
            
            return (
              <TableRow key={pool.address || index} className="border-gray-800 hover:bg-gray-900/50">
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-2">
                      <AvatarImage 
                        src={tokenMetadata?.logo || pool.mainToken?.logo || 'https://images.unsplash.com/photo-1481487196290-c152efe083f5?w=100&h=100&fit=crop&crop=faces&q=80'} 
                        alt={tokenMetadata?.name || pool.mainToken?.name || "Token logo"} 
                      />
                      <AvatarFallback className="bg-gray-800 text-gray-400">
                        {(tokenMetadata?.symbol || pool.mainToken?.symbol || "??")?.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {tokenMetadata?.name || pool.mainToken?.name || 'Unknown Token'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-900/10 text-blue-400 border-blue-500/20">
                    {pool.exchangeName || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(pool.creationTime)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-xs border-gray-800"
                      onClick={() => window.open(`https://solscan.io/account/${pool.address}`, '_blank')}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const MarketWatcher: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    data: solanaStats, 
    isLoading: isLoadingStats,
    refetch: refetchStats,
    error: statsError 
  } = useQuery({
    queryKey: ['solanaStats'],
    queryFn: fetchSolanaStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { 
    data: topTokens, 
    isLoading: isLoadingTopTokens,
    refetch: refetchTopTokens,
    error: topTokensError 
  } = useQuery({
    queryKey: ['topTokens'],
    queryFn: fetchTopTokens,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { 
    data: hotPools, 
    isLoading: isLoadingHotPools,
    refetch: refetchHotPools,
    error: hotPoolsError 
  } = useQuery({
    queryKey: ['hotPools'],
    queryFn: fetchHotPools,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { 
    data: recentTokens, 
    isLoading: isLoadingRecentTokens,
    refetch: refetchRecentTokens,
    error: recentTokensError 
  } = useQuery({
    queryKey: ['recentTokens'],
    queryFn: () => fetchRecentTokens(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    const errors = [
      { error: statsError, name: 'Solana stats' },
      { error: topTokensError, name: 'Top tokens' },
      { error: hotPoolsError, name: 'Hot pools' },
      { error: recentTokensError, name: 'Recent tokens' }
    ];

    errors.forEach(({ error, name }) => {
      if (error) {
        console.error(`Error fetching ${name}:`, error);
        toast({
          title: `Error fetching ${name}`,
          description: `Failed to load ${name.toLowerCase()}. Please try again later.`,
          variant: "destructive"
        });
      }
    });
  }, [
    statsError, 
    topTokensError, 
    hotPoolsError, 
    recentTokensError, 
    toast
  ]);

  const refreshAllData = () => {
    refetchStats();
    refetchTopTokens();
    refetchHotPools();
    refetchRecentTokens();
    
    toast({
      title: "Data refreshed",
      description: "Market data has been updated",
    });
  };

  console.log("Top tokens data:", topTokens);
  console.log("Hot pools data:", hotPools);
  console.log("Recent tokens data:", recentTokens);

  return (
    <Layout>
      <div className="container px-4 py-6 mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Watcher</h1>
            <p className="text-gray-500 mt-1">
              Real-time market data for the Solana blockchain
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search tokens or pools..."
                className="pl-8 bg-gray-900 border-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="border-gray-800 hover:bg-gray-800"
              onClick={refreshAllData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <MarketOverview stats={solanaStats} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-gray-800 bg-black/60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Top Gainers & Losers
              </CardTitle>
              <CardDescription>
                Best and worst performing tokens in the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="gainers">
                <TabsList className="grid w-full grid-cols-2 bg-gray-900/70 rounded-xl">
                  <TabsTrigger value="gainers" className="rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Gainers
                  </TabsTrigger>
                  <TabsTrigger value="losers" className="rounded-lg data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Losers
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="gainers">
                  <TopTokensTable 
                    data={topTokens?.gainers} 
                    type="gainers" 
                  />
                </TabsContent>
                <TabsContent value="losers">
                  <TopTokensTable 
                    data={topTokens?.losers} 
                    type="losers" 
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-black/60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
                Hot Pools
              </CardTitle>
              <CardDescription>
                Most active liquidity pools on Solana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HotPoolsList pools={hotPools?.hotPools} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="border-gray-800 bg-black/60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-blue-500" />
                Recent Tokens
              </CardTitle>
              <CardDescription>
                Recently created tokens on the Solana blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTokensList tokens={recentTokens} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MarketWatcher;
