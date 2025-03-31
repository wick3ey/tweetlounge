
import React, { useState } from 'react';
import { useMarketData } from '@/services/marketService';
import { TrendingUp, TrendingDown, Zap, RefreshCw, ArrowUp, ArrowDown, BarChart2, DollarSign, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

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
  
  if (price < 0.01 && price > 0) {
    return price.toFixed(6);
  }
  
  if (price < 1) {
    return price.toFixed(3);
  }
  
  if (price < 1000) {
    return price.toFixed(2);
  }
  
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

const TokenRow = ({ token, type, index }: { token: any, type: 'gainer' | 'loser' | 'hot', index: number }) => {
  const isHot = type === 'hot';
  const isPriceUp = !isHot ? token.variation24h > 0 : false;
  const isMobile = useIsMobile();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between py-2.5 px-3 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors cursor-pointer ${
        type === 'gainer' ? 'hover:bg-green-950/20' : 
        type === 'loser' ? 'hover:bg-red-950/20' : 
        'hover:bg-blue-950/20'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <Avatar className="h-8 w-8 border-2" style={{ 
            borderColor: type === 'gainer' 
              ? 'rgba(34, 197, 94, 0.4)' 
              : type === 'loser' 
                ? 'rgba(239, 68, 68, 0.4)' 
                : 'rgba(59, 130, 246, 0.4)' 
          }}>
            <AvatarImage src={token.logoUrl} alt={token.symbol} />
            <AvatarFallback className={`text-xs ${
              type === 'gainer' ? 'bg-gradient-to-br from-green-800 to-green-700' : 
              type === 'loser' ? 'bg-gradient-to-br from-red-800 to-red-700' : 
              'bg-gradient-to-br from-blue-800 to-blue-700'
            }`}>
              {token.symbol?.substring(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>
          <Badge 
            variant={type === 'gainer' ? 'success' : type === 'loser' ? 'destructive' : 'default'} 
            className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs shadow-md ${
              type === 'gainer' ? 'bg-green-500 hover:bg-green-600' :
              type === 'loser' ? 'bg-red-500 hover:bg-red-600' :
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {token.rank}
          </Badge>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="font-semibold text-sm flex items-center gap-1.5 overflow-hidden">
            <span className="truncate max-w-[120px] inline-block">{token.symbol || '???'}</span>
            <span className="text-xs text-muted-foreground truncate inline-block max-w-[150px]">
              {token.name || 'Unknown'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{token.exchange || 'Unknown'}</div>
        </div>
      </div>
      
      <div className="text-right flex-shrink-0 ml-3">
        {!isHot ? (
          <>
            <div className="font-medium text-sm whitespace-nowrap">${formatPrice(token.price)}</div>
            <div className={`text-xs ${isPriceUp ? 'text-green-500' : 'text-red-500'} font-medium flex items-center justify-end gap-1`}>
              {isPriceUp ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />}
              <span className="whitespace-nowrap">{formatPercentage(token.variation24h)}</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-blue-400 font-medium whitespace-nowrap">
            {isMobile ? new Date(token.creationTime).toLocaleDateString() : `Created: ${new Date(token.creationTime).toLocaleDateString()}`}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MarketSection = ({ 
  title, 
  icon: Icon, 
  tokens, 
  type, 
  loading, 
  accentColor,
  accentBg
}: { 
  title: string, 
  icon: any, 
  tokens: any[], 
  type: 'gainer' | 'loser' | 'hot', 
  loading: boolean,
  accentColor: string,
  accentBg: string
}) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className={`rounded-xl border border-gray-800 bg-black/80 backdrop-blur-md flex flex-col h-full shadow-lg overflow-hidden`}
  >
    <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-800/70 ${accentBg} rounded-t-xl flex-shrink-0`}>
      <div className="bg-black/30 p-1.5 rounded-full">
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
    
    <div className="flex-grow overflow-hidden">
      <ScrollArea className="h-full max-h-[calc(100vh-240px)]">
        {loading ? (
          <TokenCardSkeleton />
        ) : tokens && tokens.length > 0 ? (
          tokens.map((token, index) => (
            <TokenRow key={type === 'hot' ? token.poolAddress : token.address} token={token} type={type} index={index} />
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground">No {title.toLowerCase()} to display</div>
        )}
      </ScrollArea>
    </div>
  </motion.div>
);

// Stats Panel Component for Market Overview
const StatsPanel = ({ marketData, loading }: { marketData: any, loading: boolean }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800/40 rounded-lg p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }
  
  // Sample stats - in real implementation these would come from marketData
  const stats = [
    { 
      title: "Total Market Cap", 
      value: "$2.75T", 
      icon: DollarSign, 
      change: 1.2, 
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400"
    },
    { 
      title: "24h Volume", 
      value: "$75.98B", 
      icon: BarChart2, 
      change: -2.5, 
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400" 
    },
    { 
      title: "BTC Dominance", 
      value: "59.3%", 
      icon: TrendingUp, 
      change: 0.3, 
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400" 
    },
    { 
      title: "ETH Dominance", 
      value: "7.9%", 
      icon: TrendingUp, 
      change: -0.1, 
      bgColor: "bg-teal-500/10",
      textColor: "text-teal-400" 
    }
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`rounded-xl p-4 ${stat.bgColor} border border-gray-800`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-black/30 rounded-full">
              <stat.icon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-gray-400">{stat.title}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</span>
            <span className={`text-xs flex items-center ${stat.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stat.change > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(stat.change)}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
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
    <Layout fullWidth={true}>
      <div className="p-4 sm:p-6 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text"
            >
              Crypto Market Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-muted-foreground text-base sm:text-lg"
            >
              Latest movements, gainers, losers, and hot new tokens
            </motion.p>
          </div>
          
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="default" 
            className="gap-2 self-start hover:bg-gray-800/50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 
            <span>Refresh Markets</span>
          </Button>
        </div>

        {/* Market Stats Overview */}
        <StatsPanel marketData={marketData} loading={loading} />

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 mb-6"
          >
            <h3 className="text-red-500 font-semibold mb-1">Error Loading Data</h3>
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}

        {marketData && !loading && (
          <div className="text-sm text-muted-foreground mb-4">
            Last updated: {formatTime(marketData.lastUpdated)}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <MarketSection
            title="Top Gainers"
            icon={TrendingUp}
            tokens={marketData?.gainers?.slice(0, 12) || []}
            type="gainer"
            loading={loading}
            accentColor="#22c55e"
            accentBg="bg-green-500/10"
          />
          
          <MarketSection
            title="Top Losers"
            icon={TrendingDown}
            tokens={marketData?.losers?.slice(0, 12) || []}
            type="loser"
            loading={loading}
            accentColor="#ef4444"
            accentBg="bg-red-500/10"
          />
          
          <MarketSection
            title="Hot New Tokens"
            icon={Zap}
            tokens={marketData?.hotPools?.slice(0, 12) || []}
            type="hot"
            loading={loading}
            accentColor="#3b82f6"
            accentBg="bg-blue-500/10"
          />
        </div>
        
        {/* External Link */}
        <div className="mt-6 text-center">
          <a 
            href="https://coingecko.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View complete market data <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default Market;
