
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Activity, Zap, Image, Wallet, Users, Flame } from 'lucide-react'

interface TrendingTopic {
  id: number
  title: string
  tweets: number
  isHot?: boolean
  category: 'all' | 'token' | 'defi' | 'nft' | 'web3' | 'community' | 'news'
  icon: React.ReactNode
}

const TrendingTopics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all')
  
  const topics: TrendingTopic[] = [
    {
      id: 1,
      title: '#Ethereum Merge',
      tweets: 54300,
      isHot: true,
      category: 'token',
      icon: <Activity className="w-4 h-4 text-purple-500" />
    },
    {
      id: 2,
      title: '#NFT Winter',
      tweets: 32900,
      category: 'nft',
      icon: <Image className="w-4 h-4 text-indigo-400" />
    },
    {
      id: 3,
      title: '#DeFi Yield',
      tweets: 28500,
      category: 'defi',
      icon: <Zap className="w-4 h-4 text-yellow-500" />
    },
    {
      id: 4,
      title: '#Governance Proposals',
      tweets: 26400,
      category: 'community',
      icon: <Users className="w-4 h-4 text-blue-400" />
    },
    {
      id: 5,
      title: '#zkEVM',
      tweets: 21100,
      isHot: true,
      category: 'web3',
      icon: <Activity className="w-4 h-4 text-green-500" />
    },
    {
      id: 6,
      title: '#Layer 2 Scaling',
      tweets: 19800,
      category: 'web3',
      icon: <Wallet className="w-4 h-4 text-cyan-400" />
    },
  ]

  const filteredTopics = activeTab === 'all' 
    ? topics 
    : topics.filter(topic => topic.category === activeTab)

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <Card className="crypto-stats-card mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-crypto-blue mr-2" />
            <CardTitle className="text-base font-display">Trending Topics</CardTitle>
          </div>
          <div className="flex items-center text-xs bg-crypto-blue/20 text-crypto-blue rounded-full px-2 py-0.5">
            <span className="mr-1">Live</span>
            <div className="w-2 h-2 rounded-full bg-crypto-blue animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            className={`crypto-tab ${activeTab === 'all' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'token' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('token')}
          >
            Token
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'defi' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('defi')}
          >
            DeFi
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'nft' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('nft')}
          >
            NFT
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'web3' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('web3')}
          >
            Web3
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'community' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('community')}
          >
            Community
          </button>
          <button 
            className={`crypto-tab ${activeTab === 'news' ? 'crypto-tab-active' : 'crypto-tab-inactive'}`}
            onClick={() => setActiveTab('news')}
          >
            News
          </button>
        </div>

        <div className="space-y-4">
          {filteredTopics.map(topic => (
            <div key={topic.id} className="flex items-center justify-between border-l-2 border-crypto-blue pl-3 py-1">
              <div className="flex items-center">
                <div className="mr-3">
                  {topic.icon}
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">{topic.title}</p>
                    {topic.isHot && (
                      <span className="ml-2 flex items-center text-xs text-red-500">
                        <Flame className="w-3 h-3 mr-0.5" />
                        Hot
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-crypto-lightgray">{formatNumber(topic.tweets)} tweets</p>
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-crypto-gray/50 rounded font-medium">
                {topic.category === 'token' && 'Token'}
                {topic.category === 'defi' && 'DeFi'}
                {topic.category === 'nft' && 'NFT'}
                {topic.category === 'web3' && 'Web3'}
                {topic.category === 'community' && 'Community'}
                {topic.category === 'news' && 'News'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TrendingTopics
