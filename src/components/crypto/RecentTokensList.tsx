
import React, { useEffect, useRef } from 'react';
import { TokenInfo, preloadImages } from '@/services/marketService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye } from 'lucide-react';

interface RecentTokensListProps {
  tokens: TokenInfo[] | undefined;
}

const RecentTokensList: React.FC<RecentTokensListProps> = ({ tokens }) => {
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const imagesPreloadedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Preload token images when tokens data is available
    if (safeTokens.length > 0 && !imagesPreloadedRef.current) {
      const urls = safeTokens
        .map(token => token.logo)
        .filter(url => !!url) as string[];
      
      if (urls.length > 0) {
        console.log(`Preloading ${urls.length} images from RecentTokensList component`);
        imagesPreloadedRef.current = true;
        preloadImages(urls)
          .then(() => console.log('Recent token images preloaded successfully'))
          .catch(err => console.error('Error preloading recent token images:', err));
      }
    }
  }, [safeTokens]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const shortenAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };
  
  if (!tokens) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">Loading recent tokens...</div>
      </div>
    );
  }
  
  if (safeTokens.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">No recent tokens found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black">
            <TableHead>Token</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeTokens.map((token) => (
            <TableRow key={token.address} className="border-gray-800 hover:bg-gray-900/50">
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage 
                      src={token.logo} 
                      alt={token.name} 
                      loading="eager" // Use eager loading
                    />
                    <AvatarFallback className="text-xs bg-gray-800 text-gray-400">
                      {token.symbol?.substring(0, 2) || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{token.name}</span>
                </div>
              </TableCell>
              <TableCell>{token.symbol}</TableCell>
              <TableCell>{formatDate(token.creationTime || '')}</TableCell>
              <TableCell>
                <span className="text-xs text-gray-400">{shortenAddress(token.address)}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 text-xs border-gray-800"
                    onClick={() => window.open(`https://solscan.io/token/${token.address}`, '_blank')}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecentTokensList;
