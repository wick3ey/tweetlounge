
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import MarketHeader, { MarketStat } from '@/components/market/MarketHeader';
import TokenTable, { TokenData } from '@/components/market/TokenTable';
import TrendingPools, { PoolData } from '@/components/market/TrendingPools';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { 
  fetchGainers, 
  fetchHotPools, 
  fetchLosers, 
  fetchMarketOverview,
  fetchRecentTokens,
  formatNumber,
  formatPercent,
  isPositivePercent
} from '@/utils/marketService';

// Define a type for the API response that might contain a tokens array
interface TokensResponse {
  tokens?: any[];
  [key: string]: any;
}

const MarketWatcher = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  
  // Fetch market overview data
  const {
    data: marketOverview,
    isLoading: isLoadingOverview,
    refetch: refetchOverview
  } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: fetchMarketOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Update market stats when market overview data changes
  useEffect(() => {
    if (marketOverview) {
      const stats: MarketStat[] = [
        {
          label: 'SOL Price',
          value: formatNumber(marketOverview.solPrice, 2),
          change: `${formatPercent(marketOverview.solChange24h)} (24h)`,
          isPositive: isPositivePercent(marketOverview.solChange24h)
        },
        {
          label: 'Market Volume 24h',
          value: formatNumber(marketOverview.marketVolume24h, 1),
          change: `${formatPercent(marketOverview.marketVolumeChange24h)} (24h)`,
          isPositive: isPositivePercent(marketOverview.marketVolumeChange24h)
        },
        {
          label: 'Total Value Locked',
          value: formatNumber(marketOverview.totalValueLocked, 1),
          change: `${formatPercent(marketOverview.tvlChange24h)} (24h)`,
          isPositive: isPositivePercent(marketOverview.tvlChange24h)
        },
        {
          label: 'New Tokens 24h',
          value: marketOverview.newTokens24h.toString(),
          change: `${formatPercent(marketOverview.newTokensChange24h)} (24h)`,
          isPositive: isPositivePercent(marketOverview.newTokensChange24h)
        }
      ];
      setMarketStats(stats);
    }
  }, [marketOverview]);
  
  // Fetch hot pools
  const { 
    data: hotPoolsData = [], 
    isLoading: isLoadingHotPools,
    refetch: refetchHotPools
  } = useQuery({
    queryKey: ['hotPools'],
    queryFn: fetchHotPools,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch gainers
  const { 
    data: gainersData = [], 
    isLoading: isLoadingGainers,
    refetch: refetchGainers 
  } = useQuery({
    queryKey: ['gainers'],
    queryFn: () => fetchGainers(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch losers
  const { 
    data: losersData = [], 
    isLoading: isLoadingLosers,
    refetch: refetchLosers
  } = useQuery({
    queryKey: ['losers'],
    queryFn: () => fetchLosers(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch recent tokens
  const { 
    data: recentTokensData = [], 
    isLoading: isLoadingRecentTokens,
    refetch: refetchRecentTokens
  } = useQuery({
    queryKey: ['recentTokens'],
    queryFn: () => fetchRecentTokens(0, 10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Transform hot pools data to the format expected by the component
  const transformedHotPools: PoolData[] = hotPoolsData.map((pool) => ({
    address: pool.address,
    name: pool.name || 'Unknown',
    symbol: pool.symbol || 'UNKNOWN',
    logo: pool.logo || '',
    price: pool.price || 0,
    priceFormatted: formatNumber(pool.price, pool.price < 0.01 ? 4 : 2),
    change24h: pool.variation24h || 0,
    change24hFormatted: formatPercent(pool.variation24h || 0),
    volume24h: pool.volume24h || 0,
    volume24hFormatted: formatNumber(pool.volume24h || 0),
    liquidity: pool.liquidity || 0,
    liquidityFormatted: formatNumber(pool.liquidity || 0),
    vLRatio: pool.liquidity > 0 ? (pool.volume24h / pool.liquidity) : 0
  }));
  
  // Transform token data for tables
  const transformTokensForTable = (tokensData: any[] | TokensResponse): TokenData[] => {
    // Make a local variable to hold the tokens array
    let tokens: any[] = [];
    
    // Check if tokensData is actually an object with a tokens property (API response format)
    if (tokensData && typeof tokensData === 'object' && !Array.isArray(tokensData) && 'tokens' in tokensData) {
      console.log('Found tokens array inside object:', tokensData.tokens);
      // Extract the tokens array from the object
      tokens = tokensData.tokens || [];
    } else if (Array.isArray(tokensData)) {
      tokens = tokensData;
    } else {
      console.error('Expected tokens to be an array or object with tokens property but got:', tokensData);
      return [];
    }
    
    if (!Array.isArray(tokens)) {
      console.error('Failed to extract tokens array:', tokens);
      return [];
    }
    
    return tokens.map(token => ({
      address: token.address,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'UNKNOWN',
      logo: token.logo || '',
      price: token.price || 0,
      priceFormatted: formatNumber(token.price, token.price < 0.01 ? 4 : 2),
      change24h: token.variation24h || 0,
      change24hFormatted: formatPercent(token.variation24h || 0),
      volume24h: token.volume24h || 0,
      volume24hFormatted: formatNumber(token.volume24h || 0),
      marketCap: token.marketCap || 0,
      marketCapFormatted: formatNumber(token.marketCap || 0)
    }));
  };
  
  // Apply search filter to tokens and pools
  const filterTokensBySearch = (tokens: TokenData[]): TokenData[] => {
    if (!searchTerm) return tokens;
    
    const term = searchTerm.toLowerCase();
    return tokens.filter(token => 
      token.name.toLowerCase().includes(term) || 
      token.symbol.toLowerCase().includes(term) ||
      token.address.toLowerCase().includes(term)
    );
  };
  
  const filterPoolsBySearch = (pools: PoolData[]): PoolData[] => {
    if (!searchTerm) return pools;
    
    const term = searchTerm.toLowerCase();
    return pools.filter(pool => 
      pool.name.toLowerCase().includes(term) || 
      pool.symbol.toLowerCase().includes(term) ||
      pool.address.toLowerCase().includes(term)
    );
  };
  
  // Handle refresh of all data
  const handleRefreshAll = () => {
    refetchOverview();
    refetchHotPools();
    refetchGainers();
    refetchLosers();
    refetchRecentTokens();
    
    toast({
      title: "Data refreshed",
      description: "Market data has been updated",
    });
  };
  
  // Handle token details view
  const handleViewTokenDetails = (address: string) => {
    // In a real app, we would navigate to a token details page
    // For now, we'll just open DexTools in a new tab
    window.open(`https://www.dextools.io/app/en/solana/pair-explorer/${address}`, '_blank');
  };
  
  // Safely transform data with error checking
  const safeTransform = (data: any, transformer: Function) => {
    try {
      return transformer(data);
    } catch (error) {
      console.error('Error transforming data:', error);
      return [];
    }
  };
  
  // Safely get gainers data for display
  const getGainersForDisplay = (count?: number): TokenData[] => {
    if (!Array.isArray(gainersData)) return [];
    
    const dataToUse = count ? gainersData.slice(0, count) : gainersData;
    return safeTransform(dataToUse, transformTokensForTable);
  };
  
  // Safely get losers data for display
  const getLosersForDisplay = (count?: number): TokenData[] => {
    if (!Array.isArray(losersData)) return [];
    
    const dataToUse = count ? losersData.slice(0, count) : losersData;
    return safeTransform(dataToUse, transformTokensForTable);
  };
  
  // Safely get recent tokens data for display
  const getRecentTokensForDisplay = (): TokenData[] => {
    return safeTransform(recentTokensData, transformTokensForTable);
  };
  
  return (
    <Layout>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Market Watcher</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAll}
            className="border-gray-800 hover:border-purple-500 hover:bg-purple-500/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        
        <MarketHeader stats={marketStats} onSearch={setSearchTerm} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gradient-to-r from-gray-900 to-black border border-gray-800">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="gainers"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              Top Gainers
            </TabsTrigger>
            <TabsTrigger 
              value="losers"
              className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
            >
              Top Losers
            </TabsTrigger>
            <TabsTrigger 
              value="recent"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              New Tokens
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <TrendingPools 
              pools={filterPoolsBySearch(transformedHotPools)}
              loading={isLoadingHotPools}
              onSelect={handleViewTokenDetails}
            />
            
            <TokenTable 
              tokens={filterTokensBySearch(getGainersForDisplay(5))}
              title="Top Gainers (24h)"
              loading={isLoadingGainers}
              onViewDetails={handleViewTokenDetails}
            />
            
            <TokenTable 
              tokens={filterTokensBySearch(getLosersForDisplay(5))}
              title="Top Losers (24h)"
              loading={isLoadingLosers}
              onViewDetails={handleViewTokenDetails}
            />
          </TabsContent>
          
          <TabsContent value="gainers">
            <TokenTable 
              tokens={filterTokensBySearch(getGainersForDisplay())}
              title="Top Gainers (24h)"
              loading={isLoadingGainers}
              onViewDetails={handleViewTokenDetails}
            />
          </TabsContent>
          
          <TabsContent value="losers">
            <TokenTable 
              tokens={filterTokensBySearch(getLosersForDisplay())}
              title="Top Losers (24h)"
              loading={isLoadingLosers}
              onViewDetails={handleViewTokenDetails}
            />
          </TabsContent>
          
          <TabsContent value="recent">
            <TokenTable 
              tokens={filterTokensBySearch(getRecentTokensForDisplay())}
              title="Recently Added Tokens"
              loading={isLoadingRecentTokens}
              onViewDetails={handleViewTokenDetails}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MarketWatcher;
