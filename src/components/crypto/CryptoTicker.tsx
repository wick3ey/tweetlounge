
import React from 'react'
import { useCryptoData, CryptoCurrency } from '@/utils/coingeckoService'
import { Loader2 } from 'lucide-react'

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

// Fallback data in case the API fails
const fallbackCryptoData: CryptoCurrency[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 64289.45, change: 2.3 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 2943.16, change: 1.7 },
  { id: 'binancecoin', name: 'Binance Coin', symbol: 'BNB', price: 412.94, change: 0.5 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', price: 103.22, change: 4.2 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.5300, change: 1.2 },
  { id: 'ripple', name: 'Ripple', symbol: 'XRP', price: 0.5800, change: 0.3 },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 6.87, change: 2.1 },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.1300, change: 5.5 },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', price: 36.42, change: 2.4 },
  { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: 0.000022, change: -1.2 },
]

const CryptoTicker: React.FC = () => {
  const { cryptoData, loading, error } = useCryptoData()
  
  // Use real data if available, otherwise fallback to mock data
  const displayData = cryptoData.length > 0 ? cryptoData : fallbackCryptoData

  return (
    <div className="w-full bg-crypto-darkgray border-b border-crypto-gray overflow-hidden py-3">
      <div className="flex items-center space-x-6 animate-marquee">
        <div className="font-display text-crypto-blue font-bold px-4 flex items-center">
          {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          CRYPTO
        </div>
        {displayData.map((crypto, index) => (
          <CryptoTickerItem 
            key={index}
            name={crypto.name}
            symbol={crypto.symbol}
            price={crypto.price}
            change={crypto.change}
          />
        ))}
      </div>
    </div>
  )
}

export default CryptoTicker
