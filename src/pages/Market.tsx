import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingUp, ArrowDownUp, Download } from 'lucide-react';
import MarketStats from '@/components/crypto/MarketStats';
import TokenCard from '@/components/market/TokenCard';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import { useToast } from '@/components/ui/use-toast';
import { fetchMarketData } from '@/services/marketService';
import { cacheAllTokenLogos } from '@/services/storageService';

const Market = () => {
  const { toast } = useToast();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'marketCap',
    direction: 'desc'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [downloadingLogos, setDownloadingLogos] = useState(false);
  const [downloadStats, setDownloadStats] = useState({ total: 0, completed: 0, success: 0, failed: 0 });

  // Fetch market data
  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketData();
      if (data && Array.isArray(data)) {
        setMarketData(data);
        setFilteredData(sortData(data, sortConfig.key, sortConfig.direction));
      } else {
        toast({
          title: 'Failed to load market data',
          description: 'Please try again later',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch market data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, sortConfig.key, sortConfig.direction]);

  // Automatically download token logos when the page loads
  useEffect(() => {
    if (marketData.length > 0 && !downloadingLogos) {
      // Auto-download logos in the background
      const downloadLogos = async () => {
        try {
          setDownloadingLogos(true);
          const tokensWithLogos = marketData.filter(token => token.logo);
          
          setDownloadStats({
            total: tokensWithLogos.length,
            completed: 0,
            success: 0,
            failed: 0
          });
          
          // Process in smaller batches
          const results = await cacheAllTokenLogos(tokensWithLogos, 3);
          
          setDownloadStats({
            total: results.total,
            completed: results.total,
            success: results.success,
            failed: results.failed
          });
          
          console.log('Logo download results:', results);
        } catch (error) {
          console.error('Error auto-downloading logos:', error);
        } finally {
          setDownloadingLogos(false);
        }
      };
      
      downloadLogos();
    }
  }, [marketData, downloadingLogos]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredData(sortData(marketData, sortConfig.key, sortConfig.direction));
    } else {
      const filtered = marketData.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(sortData(filtered, sortConfig.key, sortConfig.direction));
    }
  }, [searchTerm, marketData, sortConfig]);

  // Handle tab changes
  useEffect(() => {
    let filteredByTab = [...marketData];
    
    if (activeTab === 'trending') {
      filteredByTab = marketData.filter(crypto => crypto.change > 5);
    } else if (activeTab === 'gainers') {
      filteredByTab = marketData.filter(crypto => crypto.change > 0);
    } else if (activeTab === 'losers') {
      filteredByTab = marketData.filter(crypto => crypto.change < 0);
    }
    
    if (searchTerm.trim() !== '') {
      filteredByTab = filteredByTab.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(sortData(filteredByTab, sortConfig.key, sortConfig.direction));
  }, [activeTab, marketData, searchTerm, sortConfig]);

  // Download all token logos manually
  const handleDownloadAllLogos = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      event.preventDefault();
      setDownloadingLogos(true);
      
      toast({
        title: 'Downloading token logos',
        description: 'This process may take a minute or two...'
      });
      
      const tokensWithLogos = marketData.filter(token => token.logo);
      
      setDownloadStats({
        total: tokensWithLogos.length,
        completed: 0,
        success: 0,
        failed: 0
      });
      
      const results = await cacheAllTokenLogos(tokensWithLogos, 3);
      
      setDownloadStats({
        total: results.total,
        completed: results.total,
        success: results.success,
        failed: results.failed
      });
      
      toast({
        title: 'Logo download completed',
        description: `Successfully cached ${results.success} of ${results.total} logos.`
      });
      
      // Trigger a refresh to show the cached logos
      loadMarketData();
    } catch (error) {
      console.error('Error downloading logos:', error);
      toast({
        title: 'Error',
        description: 'Failed to download some token logos',
        variant: 'destructive'
      });
    } finally {
      setDownloadingLogos(false);
    }
  };

  // Sort data
  const sortData = (data: any[], key: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      if (a[key] === undefined || a[key] === null) return direction === 'asc' ? -1 : 1;
      if (b[key] === undefined || b[key] === null) return direction === 'asc' ? 1 : -1;
      
      const compareResult = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return direction === 'asc' ? compareResult : -compareResult;
    });
  };

  // Handle sort
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    setFilteredData(sortData(filteredData, key, direction));
  };

  return (
    <Layout pageTitle="Market" hideRightSidebar={false}>
      <div className="p-4">
        <MarketStats />
        
        <div className="flex justify-between items-center mt-6 mb-4">
          <h2 className="text-xl font-bold">Cryptocurrencies</h2>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search coins..."
                className="pl-8 bg-gray-950 border-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => requestSort('price')}
              className="hidden sm:flex"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadAllLogos}
              disabled={downloadingLogos}
              className="hidden sm:flex"
              title="Download all token logos"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {downloadingLogos && downloadStats.total > 0 && (
          <div className="mb-4 p-3 bg-gray-900 rounded-md border border-gray-800">
            <p className="text-sm text-gray-400">
              Downloading token logos: {downloadStats.success + downloadStats.failed}/{downloadStats.total} 
              ({Math.round(((downloadStats.success + downloadStats.failed) / downloadStats.total) * 100)}%)
            </p>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.round(((downloadStats.success + downloadStats.failed) / downloadStats.total) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Coins</TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="mr-1 h-4 w-4" /> Trending
            </TabsTrigger>
            <TabsTrigger value="gainers">Gainers</TabsTrigger>
            <TabsTrigger value="losers">Losers</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              // Loading skeletons
              Array(10)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border border-gray-800 rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                ))
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No cryptocurrencies found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData.map((crypto) => (
                  <TokenCard key={crypto.id} token={crypto} showMarketData={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <TrendingTopics />
        </div>
      </div>
    </Layout>
  );
};

export default Market;
