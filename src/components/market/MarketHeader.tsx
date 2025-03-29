
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface MarketStat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface MarketHeaderProps {
  stats: MarketStat[];
  onSearch: (term: string) => void;
}

const MarketHeader: React.FC<MarketHeaderProps> = ({ stats, onSearch }) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Solana Market Watcher
          </h1>
          <p className="text-muted-foreground">
            Track the latest trends, stats and movements on Solana
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            className="pl-9 bg-background/60 border-gray-800 focus:border-purple-500 transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gradient-to-br from-gray-900 to-black border-gray-800 overflow-hidden">
            <CardContent className="p-4 relative">
              {stat.isPositive ? (
                <TrendingUp className="absolute top-3 right-3 h-5 w-5 text-green-500 opacity-30" />
              ) : (
                <TrendingDown className="absolute top-3 right-3 h-5 w-5 text-red-500 opacity-30" />
              )}
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="text-xl font-semibold mt-1">{stat.value}</span>
                <span className={`text-xs mt-1 flex items-center gap-1 ${
                  stat.isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {stat.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MarketHeader;
