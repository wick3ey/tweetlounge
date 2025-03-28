
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, BarChart, Clock, Coins, TrendingUp, Activity } from 'lucide-react'

const MarketStats: React.FC = () => {
  return (
    <Card className="crypto-stats-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-crypto-blue mr-2" />
            <CardTitle className="text-base font-display">Market Stats</CardTitle>
          </div>
          <div className="flex items-center text-xs bg-crypto-blue/20 text-crypto-blue rounded-full px-2 py-0.5">
            <span className="mr-1">Live</span>
            <div className="w-2 h-2 rounded-full bg-crypto-blue animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Coins className="w-3.5 h-3.5 mr-1" />
              <span>Total Market Cap</span>
            </div>
            <div className="font-display font-semibold">$2.72T</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <BarChart className="w-3.5 h-3.5 mr-1" />
              <span>BTC Dominance</span>
            </div>
            <div className="font-display font-semibold">51.2%</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>24h Volume</span>
            </div>
            <div className="font-display font-semibold">$64.60B</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              <span>ETH Dominance</span>
            </div>
            <div className="font-display font-semibold">18.7%</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <Coins className="w-3.5 h-3.5 mr-1" />
              <span>Active Cryptocurrencies</span>
            </div>
            <div className="font-display font-semibold">21,572</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-xs text-crypto-lightgray">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Fear & Greed Index</span>
            </div>
            <div className="font-display font-semibold text-crypto-green">64 Greed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MarketStats
