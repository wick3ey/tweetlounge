
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Zap, DollarSign, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface PoolData {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  change24hFormatted: string;
  volume24h: number;
  volume24hFormatted: string;
  liquidity: number;
  liquidityFormatted: string;
  vLRatio: number; // Volume to Liquidity ratio
}

interface TrendingPoolsProps {
  pools: PoolData[];
  loading: boolean;
  onSelect: (address: string) => void;
}

const TrendingPools: React.FC<TrendingPoolsProps> = ({ pools, loading, onSelect }) => {
  if (loading) {
    return (
      <Card className="bg-black/30 border-gray-800 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-yellow-500" />
            <Skeleton className="h-6 w-40" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 border border-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-black/30 border-gray-800 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Trending Pools</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <div 
              key={pool.address}
              className="flex flex-col gap-3 p-4 border border-gray-800 rounded-lg bg-gradient-to-br from-gray-900 to-black hover:border-gray-700 transition-all cursor-pointer"
              onClick={() => onSelect(pool.address)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-full overflow-hidden border border-gray-800">
                  <AvatarImage src={pool.logo} alt={pool.name} />
                  <AvatarFallback className="bg-gray-800 text-xs">
                    {pool.symbol.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium truncate">{pool.name}</div>
                  <div className="text-xs text-muted-foreground">{pool.symbol}</div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${
                    pool.change24h >= 0 
                      ? 'border-green-500/30 bg-green-500/10 text-green-500' 
                      : 'border-red-500/30 bg-red-500/10 text-red-500'
                  }`}
                >
                  {pool.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  {pool.change24hFormatted}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex flex-col p-2 rounded-md bg-gray-900/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Price
                  </span>
                  <span className="text-sm font-medium">{pool.priceFormatted}</span>
                </div>
                <div className="flex flex-col p-2 rounded-md bg-gray-900/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BarChart2 className="h-3 w-3" /> Volume 24h
                  </span>
                  <span className="text-sm font-medium">{pool.volume24hFormatted}</span>
                </div>
                <div className="flex flex-col p-2 rounded-md bg-gray-900/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Liquidity
                  </span>
                  <span className="text-sm font-medium">{pool.liquidityFormatted}</span>
                </div>
                <div className="flex flex-col p-2 rounded-md bg-gray-900/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BarChart2 className="h-3 w-3" /> V/L Ratio
                  </span>
                  <span className="text-sm font-medium">{pool.vLRatio.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendingPools;
