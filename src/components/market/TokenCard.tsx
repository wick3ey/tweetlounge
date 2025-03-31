
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cacheTokenLogo } from '@/services/storageService';
import { Skeleton } from '@/components/ui/skeleton';

interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change: number;
    logo?: string;
    marketCap?: number;
    volume?: number;
  };
  showMarketData?: boolean;
}

const TokenCard: React.FC<TokenCardProps> = ({ token, showMarketData = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      setImageLoading(true);
      setImageError(false);
      
      try {
        if (token.logo) {
          // Try to get the cached version or cache it
          const cachedUrl = await cacheTokenLogo(token.id, token.logo);
          
          if (isMounted) {
            setImageUrl(cachedUrl || token.logo);
            setImageLoading(false);
          }
        } else {
          if (isMounted) {
            setImageLoading(false);
            setImageError(true);
          }
        }
      } catch (error) {
        console.error(`Error loading image for ${token.name}:`, error);
        if (isMounted) {
          setImageUrl(token.logo || null);
          setImageLoading(false);
          setImageError(true);
        }
      }
    };
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [token.id, token.logo, token.name]);

  const handleImageError = () => {
    setImageError(true);
  };

  // Format price with proper decimal places
  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(2);
    return price.toFixed(2);
  };

  // Format market cap and volume with K, M, B suffixes
  const formatLargeNumber = (num?: number) => {
    if (!num) return 'N/A';
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
    return `${(num / 1000000000).toFixed(1)}B`;
  };

  return (
    <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {imageLoading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : imageError ? (
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                {token.symbol.substring(0, 2).toUpperCase()}
              </div>
            ) : (
              <img 
                src={imageUrl || ''} 
                alt={token.name} 
                className="h-8 w-8 rounded-full object-contain"
                onError={handleImageError}
              />
            )}
            
            <div>
              <p className="font-medium">{token.name}</p>
              <p className="text-gray-400 text-sm">{token.symbol.toUpperCase()}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-bold">${formatPrice(token.price)}</p>
            <p className={`text-sm ${token.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {token.change >= 0 ? '+' : ''}{token.change.toFixed(2)}%
            </p>
          </div>
        </div>
        
        {showMarketData && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-800 text-sm">
            <div>
              <p className="text-gray-400">Market Cap</p>
              <p>${formatLargeNumber(token.marketCap)}</p>
            </div>
            <div>
              <p className="text-gray-400">Volume (24h)</p>
              <p>${formatLargeNumber(token.volume)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenCard;
