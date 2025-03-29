
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import HotPoolsList from '@/components/crypto/HotPoolsList';
import { fetchHotPools } from '@/services/marketService';
import { useQuery } from '@tanstack/react-query';

const MarketWatcher: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [lastRefreshStatus, setLastRefreshStatus] = useState<'success' | 'error' | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Fetch hot pools data
  const { data: hotPoolsData, isLoading, error, refetch } = useQuery({
    queryKey: ['hotPools'],
    queryFn: fetchHotPools,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setErrorDetails(null);
    try {
      toast({
        title: "Refreshing Market Cache",
        description: "This may take a few moments...",
      });

      const { data, error } = await supabase.functions.invoke('refreshCache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error('Cache refresh error:', error);
        setLastRefreshStatus('error');
        setErrorDetails(error.message);
        toast({
          title: 'Cache Refresh Failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        console.log('Cache refresh response:', data);
        setLastRefreshStatus('success');
        
        // Format summary of results
        const succeeded = data?.summary?.succeeded || 0;
        const failed = data?.summary?.failed || 0;
        const timestamp = data?.refreshed || new Date().toISOString();
        
        setLastRefreshed(timestamp);
        
        let toastMessage = 'Market data cache has been refreshed';
        if (succeeded > 0 || failed > 0) {
          toastMessage += `: ${succeeded} succeeded, ${failed} failed`;
        }
        
        toast({
          title: 'Cache Refreshed',
          description: toastMessage,
        });
        
        // Refresh the data display
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Unexpected error during cache refresh:', err);
      setLastRefreshStatus('error');
      setErrorDetails(err?.message || 'Unknown error');
      toast({
        title: 'Refresh Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Market Watcher</h1>
        <Button 
          onClick={handleManualRefresh} 
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Market Cache'}
        </Button>
      </div>
      
      {lastRefreshStatus && (
        <Card className={lastRefreshStatus === 'success' ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {lastRefreshStatus === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">
                {lastRefreshStatus === 'success' ? 'Cache Refresh Successful' : 'Cache Refresh Failed'}
              </CardTitle>
            </div>
            {lastRefreshed && (
              <CardDescription>
                Last refresh attempt: {new Date(lastRefreshed).toLocaleString()}
              </CardDescription>
            )}
          </CardHeader>
          {errorDetails && (
            <CardContent className="pt-0">
              <div className="text-sm p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500">
                {errorDetails}
              </div>
            </CardContent>
          )}
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Hot Pools</CardTitle>
          <CardDescription>Latest trending pools on Solana</CardDescription>
        </CardHeader>
        <CardContent>
          <HotPoolsList pools={hotPoolsData?.hotPools} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketWatcher;
