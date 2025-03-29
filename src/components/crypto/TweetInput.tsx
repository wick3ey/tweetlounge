
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CryptoButton } from '../ui/crypto-button'
import { Image, Link, Smile, User } from 'lucide-react'

const TweetInput: React.FC = () => {
  return (
    <Card className="crypto-stats-card">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 border border-crypto-gray/50">
            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="mb-3">
              <textarea 
                className="w-full bg-transparent border-none resize-none focus:outline-none text-crypto-text placeholder:text-crypto-lightgray"
                placeholder="Vad händer i kryptovärlden?"
                rows={2}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors">
                  <Image className="h-5 w-5" />
                </button>
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors">
                  <Link className="h-5 w-5" />
                </button>
                <button className="p-2 text-crypto-lightgray hover:text-crypto-blue rounded-full hover:bg-crypto-blue/10 transition-colors">
                  <Smile className="h-5 w-5" />
                </button>
              </div>
              
              <CryptoButton size="sm">
                Tweet
              </CryptoButton>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TweetInput
