import React, { useState } from 'react';
import { useMarketData, extractFinancialInfo } from '@/services/marketService';
import { TrendingUp, TrendingDown, Zap, RefreshCw, ExternalLink, ChevronRight, BarChart3, Clock, Info, DollarSign, PercentIcon, FolderOpen, Droplets, Flame, FlameIcon, Users, Coins, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TokenCardSkeleton = () => (
  <div className="p-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="flex items-center justify-between p-2 border-b border-gray-800 animate-pulse">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
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
  return price.toLocaleString('en-US', {
    maximumFractionDigits: 2
  });
};

const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(Number(num))) return "N/A";
  
  const numVal = Number(num);
  if (numVal >= 1_000_000_000) {
    return `${(numVal / 1_000_000_000).toFixed(2)}B`;
  } else if (numVal >= 1_000_000) {
    return `${(numVal / 1_000_000).toFixed(2)}M`;
  } else if (numVal >= 1_000) {
    return `${(numVal / 1_000).toFixed(2)}K`;
  }
  
  return numVal.toLocaleString();
};

const formatPercentage = (percent: number) => {
  if (isNaN(percent)) return "0%";
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return 'Just now';
  }
};

const FinancialDetail = ({ icon: Icon, label, value, tooltipText }: { icon: any, label: string, value: string, tooltipText: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Icon className="h-3 w-3 opacity-70" />
          <span>{label}:</span>
          <span className="font-medium text-gray-300">{value}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const TokenRow = ({
  token,
  type,
  index,
  expanded,
  onToggleExpand
}: {
  token: any;
  type: 'gainer' | 'loser' | 'hot';
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) => {
  const isHot = type === 'hot';
  const isPriceUp = !isHot ? token.variation24h > 0 : false;
  const isMobile = useIsMobile();
  
  const tokenAddress = isHot ? token.tokenAddress : token.address;
  const poolAddress = isHot ? token.poolAddress : token.pool;
  const dexScreenerUrl = `https://dexscreener.com/solana/${poolAddress || tokenAddress}`;
  
  const handleRowClick = () => {
    window.open(dexScreenerUrl, '_blank', 'noopener,noreferrer');
  };
  
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };
  
  const financialInfo = extractFinancialInfo(token.financialInfo || {});
  
  const marketCap = financialInfo.mcap !== null ? financialInfo.mcap : token.mcap;
  
  const getSymbolFallback = () => {
    if (!token.symbol) return "??";
    return token.symbol.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: index * 0.05 }} 
        className={`flex items-center justify-between py-2 px-4 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors cursor-pointer ${
          type === 'gainer' ? 'hover:bg-green-950/20' : 
          type === 'loser' ? 'hover:bg-red-950/20' : 
          'hover:bg-blue-950/20'
        }`}
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-3 min-w-0 w-2/3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 border-2 shadow-md" style={{
              borderColor: type === 'gainer' ? 'rgba(34, 197, 94, 0.4)' : 
                      type === 'loser' ? 'rgba(239, 68, 68, 0.4)' : 
                      'rgba(59, 130, 246, 0.4)'
            }}>
              <AvatarImage 
                src={token.logoUrl} 
                alt={token.symbol || 'Token'} 
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="${type === 'gainer' ? '#22c55e' : type === 'loser' ? '#ef4444' : '#3b82f6'}" opacity="0.8"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">${getSymbolFallback()}</text></svg>`;
                }}
              />
              <AvatarFallback className={`text-sm ${
                type === 'gainer' ? 'bg-gradient-to-br from-green-800 to-green-700' : 
                type === 'loser' ? 'bg-gradient-to-br from-red-800 to-red-700' : 
                'bg-gradient-to-br from-blue-800 to-blue-700'
              }`}>
                {getSymbolFallback()}
              </AvatarFallback>
            </Avatar>
            <Badge variant={
              type === 'gainer' ? 'success' : 
              type === 'loser' ? 'destructive' : 
              'default'
            } className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs shadow-md ${
              type === 'gainer' ? 'bg-green-500 hover:bg-green-600' : 
              type === 'loser' ? 'bg-red-500 hover:bg-red-600' : 
              'bg-blue-500 hover:bg-blue-600'
            }`}>
              {token.rank}
            </Badge>
          </div>
          <div className="min-w-0 w-full overflow-hidden">
            <div className="font-medium">
              <span className="font-semibold block text-sm text-white">{token.symbol || '???'}</span>
              <span className="text-xs text-muted-foreground block truncate max-w-full">
                {token.name || '???'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {token.exchange || 'Unknown'}
              {isHot && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 inline-flex items-center">
                        <Info className="h-3 w-3 opacity-70" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">New pool created on {token.exchange}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0 w-1/3 pl-2">
          {!isHot ? (
            <>
              <div className="font-medium text-sm whitespace-nowrap flex items-center justify-end gap-1">
                <DollarSign className="h-3 w-3 opacity-70" />
                {formatPrice(token.price)}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1 hover:bg-gray-800/50" 
                  onClick={handleExpandClick}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </div>
              <div className={`text-xs flex items-center justify-end ${isPriceUp ? 'text-green-500' : 'text-red-500'} font-medium`}>
                {isPriceUp ? (
                  <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 flex-shrink-0" />
                )}
                <span>{formatPercentage(token.variation24h)}</span>
                <span className="ml-2 text-gray-400">MCap: ${formatNumber(marketCap)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-medium whitespace-nowrap flex items-center justify-end gap-1">
                <DollarSign className="h-3 w-3 opacity-70" />
                MCap: ${formatNumber(marketCap)}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1 hover:bg-gray-800/50"
                  onClick={handleExpandClick}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs font-medium text-blue-400 whitespace-nowrap flex items-center justify-end">
                <Clock className="mr-1 h-3 w-3 opacity-70" />
                <span>{formatTimeAgo(token.creationTime)}</span>
                <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
              </div>
            </>
          )}
        </div>
      </motion.div>
      
      {expanded && (
        <div className={`px-4 py-2 text-xs border-b ${
          type === 'gainer' ? 'bg-green-950/10 border-green-900/20' : 
          type === 'loser' ? 'bg-red-950/10 border-red-900/20' : 
          'bg-blue-950/10 border-blue-900/20'
        }`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <FinancialDetail 
              icon={Coins} 
              label="Circ. Supply" 
              value={formatNumber(financialInfo.circulatingSupply)} 
              tooltipText="Circulating Supply: Total tokens in circulation"
            />
            <FinancialDetail 
              icon={Coins} 
              label="Total Supply" 
              value={formatNumber(financialInfo.totalSupply)} 
              tooltipText="Total Supply: Maximum tokens that will ever exist"
            />
            <FinancialDetail 
              icon={DollarSign} 
              label="MCap" 
              value={`$${formatNumber(financialInfo.mcap)}`} 
              tooltipText="Market Capitalization: Current value of all circulating tokens"
            />
            <FinancialDetail 
              icon={DollarSign} 
              label="FDV" 
              value={`$${formatNumber(financialInfo.fdv)}`} 
              tooltipText="Fully Diluted Valuation: Theoretical value if all tokens were in circulation"
            />
            <FinancialDetail 
              icon={Users} 
              label="Holders" 
              value={formatNumber(financialInfo.holders)} 
              tooltipText="Number of unique wallet addresses holding this token"
            />
            {financialInfo.transactions !== undefined && (
              <FinancialDetail 
                icon={Activity} 
                label="Txns" 
                value={formatNumber(financialInfo.transactions)} 
                tooltipText="Total number of transactions for this token"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

const HotTokensSection = ({ tokens, loading }: { tokens: any[]; loading: boolean }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card border-blue-950/40 rounded-xl overflow-hidden mb-6 backdrop-blur-md"
    >
      <div className="bg-gradient-to-r from-blue-950/50 to-indigo-950/30 p-4 border-b border-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600/30 p-2 rounded-full">
              <Flame className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Hot New Tokens
            </h2>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-blue-400 hover:bg-blue-900/20">
                  <Info className="h-3.5 w-3.5 mr-1" />
                  What's this?
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-[250px]">Recently created token pools with high trading activity. These are new opportunities but can be highly volatile.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="p-0">
        {loading ? (
          <TokenCardSkeleton />
        ) : tokens?.length > 0 ? (
          <div className="max-h-full">
            {tokens.slice(0, 20).map((token, index) => (
              <TokenRow 
                key={token.poolAddress} 
                token={token} 
                type="hot" 
                index={index}
                expanded={expandedIndex === index}
                onToggleExpand={() => handleToggleExpand(index)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">No hot tokens to display</div>
        )}
      </div>
      
      <div className="p-2 border-t border-blue-900/20 flex justify-end bg-blue-950/10">
        <Button variant="ghost" size="sm" className="text-xs text-blue-400 hover:bg-blue-900/20">
          View All <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
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
  accentBg,
  gradientFrom,
  gradientTo,
  borderColor,
  tooltipText,
  className
}: {
  title: string;
  icon: any;
  tokens: any[];
  type: 'gainer' | 'loser' | 'hot';
  loading: boolean;
  accentColor: string;
  accentBg: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  tooltipText: string;
  className?: string;
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: type === 'gainer' ? 0.1 : 0.2 }}
      className={`glass-card border rounded-xl flex flex-col h-full shadow-lg overflow-hidden ${className}`}
      style={{ borderColor }}
    >
      <div className={`flex items-center justify-between p-4 border-b`} style={{ 
        background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
        borderColor
      }}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full" style={{ backgroundColor: accentBg }}>
            <Icon className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{
            backgroundImage: `linear-gradient(to right, ${accentColor}, white)`
          }}>
            {title}
          </h2>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:bg-gray-800/20">
                <Info className="h-3.5 w-3.5 mr-1" />
                Info
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm max-w-[250px]">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex-grow overflow-hidden">
        {loading ? (
          <TokenCardSkeleton />
        ) : tokens && tokens.length > 0 ? (
          <div className="max-h-full">
            {tokens.slice(0, 20).map((token, index) => (
              <TokenRow 
                key={type === 'hot' ? token.poolAddress : token.address} 
                token={token} 
                type={type} 
                index={index}
                expanded={expandedIndex === index}
                onToggleExpand={() => handleToggleExpand(index)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">No {title.toLowerCase()} to display</div>
        )}
      </div>
      
      <div className="p-2 border-t flex justify-end" style={{ 
        borderColor,
        backgroundColor: type === 'gainer' ? 'rgba(22, 101, 52, 0.1)' : 
                        type === 'loser' ? 'rgba(127, 29, 29, 0.1)' : 
                        'rgba(30, 58, 138, 0.1)'
      }}>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs hover:bg-opacity-20 transition-all"
          style={{ color: accentColor }}
        >
          View All <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </motion.div>
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
    <Layout hideRightSidebar={true} fullHeight={true} collapsedSidebar={true} fullWidth={true}>
      <div className="bg-gradient-to-b from-black to-gray-900/95 min-h-screen">
        <div className="p-4 sm:p-6 flex flex-col min-h-[calc(100vh-76px)]">
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
                className="text-muted-foreground text-base sm:text-lg flex items-center"
              >
                <DollarSign className="h-4 w-4 mr-1 text-blue-400" />
                Latest movements, gainers, losers, and hot new tokens
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="default" 
                className="gap-2 self-start hover:bg-gray-800/50 transition-all border-blue-900/50 hover:border-blue-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-400' : ''}`} /> 
                <span>Refresh Markets</span>
              </Button>
            </motion.div>
          </div>

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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground mb-4 flex items-center"
            >
              <Clock className="h-4 w-4 mr-1 text-gray-500" />
              Last updated: {formatTime(marketData.lastUpdated)}
            </motion.div>
          )}
          
          <div className="flex flex-col gap-6 flex-grow">
            <HotTokensSection tokens={marketData?.hotPools || []} loading={loading} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MarketSection 
                title="Top Gainers" 
                icon={TrendingUp} 
                tokens={marketData?.gainers || []} 
                type="gainer" 
                loading={loading} 
                accentColor="#22c55e" 
                accentBg="rgba(22, 101, 52, 0.3)" 
                gradientFrom="rgba(22, 101, 52, 0.3)" 
                gradientTo="rgba(22, 163, 74, 0.1)" 
                borderColor="rgba(34, 197, 94, 0.3)"
                tooltipText="Tokens with the highest positive price change in the last 24 hours. These can represent momentum opportunities."
              />
              
              <MarketSection 
                title="Top Losers" 
                icon={TrendingDown} 
                tokens={marketData?.losers || []} 
                type="loser" 
                loading={loading} 
                accentColor="#ef4444" 
                accentBg="rgba(127, 29, 29, 0.3)" 
                gradientFrom="rgba(127, 29, 29, 0.3)" 
                gradientTo="rgba(153, 27, 27, 0.1)"
                borderColor="rgba(239, 68, 68, 0.3)"
                tooltipText="Tokens with the largest negative price change in the last 24 hours. These may represent buying opportunities at lower prices."
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Market;
