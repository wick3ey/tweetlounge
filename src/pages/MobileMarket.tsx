
import React, { useState } from 'react';
import { useMarketData } from '@/services/marketService';
import { useNewsData, formatNewsDate } from '@/utils/newsService';
import MobileLayout from '@/components/layout/MobileLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, ArrowUpRight, ArrowDownRight, BarChart3, TrendingUp, Clock, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-mobile';

const MobileMarket: React.FC = () => {
  const { marketData, loading: marketLoading } = useMarketData();
  const { newsArticles, loading: newsLoading } = useNewsData();
  const [activeTab, setActiveTab] = useState('gainers');
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!isMobile) {
    return null; // Don't render on non-mobile devices
  }

  return (
    <MobileLayout title="Market" showHeader={true} showBottomNav={true}>
      <div className="flex flex-col min-h-full">
        <div className="bg-crypto-darkgray/50 p-4">
          <h1 className="text-xl font-display font-semibold mb-1">Crypto Market</h1>
          <p className="text-sm text-crypto-lightgray">Live updates from the crypto world</p>
        </div>
        
        <Tabs defaultValue="gainers" className="w-full" onValueChange={setActiveTab}>
          <div className="sticky top-0 z-10 bg-crypto-black/90 backdrop-blur-sm border-b border-crypto-gray/30">
            <TabsList className="grid grid-cols-3 p-1 m-2 bg-crypto-darkgray/80">
              <TabsTrigger value="gainers" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <TrendingUp className="h-3 w-3 mr-1.5 text-crypto-green" />
                Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <ArrowDownRight className="h-3 w-3 mr-1.5 text-crypto-red" />
                Losers
              </TabsTrigger>
              <TabsTrigger value="news" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                <Zap className="h-3 w-3 mr-1.5 text-crypto-blue" />
                News
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gainers" className="mt-0 pt-2 px-3 pb-16">
            {marketLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="crypto-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p className="text-sm text-crypto-lightgray mt-3">Loading top gainers...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {marketData?.gainers?.slice(0, 10).map((token, index) => (
                  <Card key={index} className="crypto-card border-crypto-gray/40 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3 bg-crypto-darkgray">
                          {token.logoUrl ? (
                            <AvatarImage src={token.logoUrl} alt={token.name} />
                          ) : (
                            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                              {token.symbol.substring(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white">{token.name}</h3>
                            <span className="text-crypto-green font-medium">+{token.variation24h.toFixed(2)}%</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-sm text-crypto-lightgray">{token.symbol}</div>
                            <div className="font-medium">${token.price.toFixed(token.price < 1 ? 4 : 2)}</div>
                          </div>
                          
                          <div className="flex items-center mt-2 text-xs">
                            <Badge variant="outline" className="mr-2 bg-crypto-darkgray/50 text-crypto-lightgray border-crypto-gray/40">
                              #{token.rank}
                            </Badge>
                            <span className="text-crypto-lightgray">{token.exchange}</span>
                            <a 
                              href={`https://dexscreener.com/solana/${token.pool}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-auto text-crypto-blue flex items-center"
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Chart
                              <ExternalLink className="h-3 w-3 ml-0.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="losers" className="mt-0 pt-2 px-3 pb-16">
            {marketLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="crypto-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p className="text-sm text-crypto-lightgray mt-3">Loading top losers...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {marketData?.losers?.slice(0, 10).map((token, index) => (
                  <Card key={index} className="crypto-card border-crypto-gray/40 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3 bg-crypto-darkgray">
                          {token.logoUrl ? (
                            <AvatarImage src={token.logoUrl} alt={token.name} />
                          ) : (
                            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                              {token.symbol.substring(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white">{token.name}</h3>
                            <span className="text-crypto-red font-medium">{token.variation24h.toFixed(2)}%</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-sm text-crypto-lightgray">{token.symbol}</div>
                            <div className="font-medium">${token.price.toFixed(token.price < 1 ? 4 : 2)}</div>
                          </div>
                          
                          <div className="flex items-center mt-2 text-xs">
                            <Badge variant="outline" className="mr-2 bg-crypto-darkgray/50 text-crypto-lightgray border-crypto-gray/40">
                              #{token.rank}
                            </Badge>
                            <span className="text-crypto-lightgray">{token.exchange}</span>
                            <a 
                              href={`https://dexscreener.com/solana/${token.pool}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-auto text-crypto-blue flex items-center"
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Chart
                              <ExternalLink className="h-3 w-3 ml-0.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="news" className="mt-0 pt-2 px-3 pb-16">
            {newsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="crypto-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p className="text-sm text-crypto-lightgray mt-3">Loading latest news...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newsArticles?.slice(0, 15).map((article, index) => (
                  <Card key={index} className="crypto-card border-crypto-gray/40 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge variant="outline" className="bg-crypto-darkgray/50 text-crypto-lightgray border-crypto-gray/40 text-xs">
                            {article.source.title}
                          </Badge>
                        </div>
                        <div className="text-xs text-crypto-lightgray flex items-center">
                          <Clock className="h-3 w-3 mr-1 opacity-70" />
                          {formatNewsDate(article.published_at)}
                        </div>
                      </div>
                      
                      <h3 className="font-medium text-white mb-2 line-clamp-2">{article.title}</h3>
                      
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {article.currencies.slice(0, 3).map((currency, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-crypto-blue/10 text-crypto-blue border-none text-xs">
                            {currency.code}
                          </Badge>
                        ))}
                        {article.currencies.length > 3 && (
                          <Badge variant="secondary" className="bg-crypto-gray/20 text-crypto-lightgray border-none text-xs">
                            +{article.currencies.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-3">
                          <div className="flex items-center text-xs text-crypto-lightgray">
                            <svg className="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
                            </svg>
                            {article.votes.positive}
                          </div>
                          <div className="flex items-center text-xs text-crypto-lightgray">
                            <svg className="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 14V2"></path><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
                            </svg>
                            {article.votes.negative}
                          </div>
                          <div className="flex items-center text-xs text-crypto-lightgray">
                            <svg className="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {article.votes.important}
                          </div>
                        </div>
                        
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-crypto-blue flex items-center text-xs"
                        >
                          Read
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MobileMarket;
