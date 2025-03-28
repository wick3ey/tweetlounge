
import React from 'react'
import { useCryptoData, CryptoCurrency } from '@/utils/coingeckoService'
import { Loader2, RefreshCcw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface CryptoTickerItemProps {
  name: string
  symbol: string
  price: number
  change: number
}

const CryptoTickerItem: React.FC<CryptoTickerItemProps> = ({ name, symbol, price, change }) => {
  const formattedPrice = price < 1 ? price.toFixed(4) : price.toFixed(2)
  const formattedChange = change.toFixed(1)
  const changeColor = change >= 0 ? 'crypto-price-up' : 'crypto-price-down'
  const changeSign = change >= 0 ? '+' : ''
  
  return (
    <div className="crypto-ticker-item">
      <span className="font-medium text-white">{symbol}</span>
      <span className="text-crypto-lightgray text-xs">{name}</span>
      <span className="font-medium">{formattedPrice}</span>
      <span className={`text-xs ${changeColor}`}>
        {changeSign}{formattedChange}%
      </span>
    </div>
  )
}

const CryptoTicker: React.FC = () => {
  const { cryptoData, loading, error, refreshData } = useCryptoData()
  
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Fetching latest crypto prices...",
    });
    
    await refreshData();
    
    toast({
      title: "Prices Updated",
      description: "Crypto prices have been refreshed",
    });
  };
  
  // Display error toast if needed
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Prices",
        description: error,
        variant: "destructive"
      });
    }
  }, [error]);

  return (
    <div className="w-full bg-crypto-darkgray border-b border-crypto-gray overflow-hidden py-3">
      <div className="flex items-center space-x-6 animate-marquee">
        <div className="font-display text-crypto-blue font-bold px-4 flex items-center gap-2">
          {loading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : error ? (
            <span className="text-crypto-red text-sm">ERROR</span>
          ) : (
            <RefreshCcw 
              className="h-4 w-4 cursor-pointer hover:text-crypto-blue/80 transition-colors" 
              onClick={handleRefresh}
            />
          )}
          CRYPTO
        </div>
        {cryptoData.length > 0 ? (
          // Real data from API
          cryptoData.map((crypto, index) => (
            <CryptoTickerItem 
              key={index}
              name={crypto.name}
              symbol={crypto.symbol}
              price={crypto.price}
              change={crypto.change}
            />
          ))
        ) : loading ? (
          // Loading state
          Array(10).fill(0).map((_, index) => (
            <div key={index} className="crypto-ticker-item animate-pulse">
              <div className="h-4 w-10 bg-crypto-gray/30 rounded"></div>
              <div className="h-3 w-16 bg-crypto-gray/20 rounded"></div>
              <div className="h-4 w-14 bg-crypto-gray/30 rounded"></div>
              <div className="h-3 w-12 bg-crypto-gray/20 rounded"></div>
            </div>
          ))
        ) : (
          // Error state - show error message in ticker
          <div className="text-crypto-red px-4">Could not load cryptocurrency data. Please try again.</div>
        )}
      </div>
    </div>
  )
}

export default CryptoTicker
