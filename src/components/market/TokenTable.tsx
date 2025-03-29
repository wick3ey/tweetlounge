
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  change24hFormatted: string;
  volume24h: number;
  volume24hFormatted: string;
  marketCap: number;
  marketCapFormatted: string;
}

interface TokenTableProps {
  tokens: TokenData[];
  title: string;
  loading: boolean;
  onViewDetails?: (address: string) => void;
}

const TokenTable: React.FC<TokenTableProps> = ({ 
  tokens, 
  title, 
  loading,
  onViewDetails 
}) => {
  if (loading) {
    return (
      <Card className="bg-black/30 border-gray-800 mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!tokens.length) {
    return (
      <Card className="bg-black/30 border-gray-800 mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          <p className="text-center py-8 text-muted-foreground">No tokens available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-black/30 border-gray-800 mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="rounded-md border border-gray-800 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-900 to-black hover:bg-gray-900/50">
                <TableHead className="w-[250px]">Token</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24h %</TableHead>
                <TableHead className="text-right">24h Volume</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.address} className="hover:bg-gray-900/50 border-t border-gray-800">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-full overflow-hidden border border-gray-800">
                        <AvatarImage 
                          src={token.logo} 
                          alt={token.name} 
                        />
                        <AvatarFallback className="bg-gray-800 text-xs">
                          {token.symbol.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-xs text-muted-foreground">{token.symbol}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {token.priceFormatted}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {token.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {token.change24hFormatted}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {token.volume24hFormatted}
                  </TableCell>
                  <TableCell className="text-right">
                    {token.marketCapFormatted}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs border-gray-800 hover:border-purple-500 hover:bg-purple-500/10"
                      onClick={() => onViewDetails && onViewDetails(token.address)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenTable;
