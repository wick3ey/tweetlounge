
import React, { useEffect, useRef } from 'react';
import { PoolInfo, TokenInfo, preloadImages } from '@/services/marketService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye } from 'lucide-react';

interface HotPoolsListProps {
  pools: PoolInfo[] | undefined;
}

const HotPoolsList: React.FC<HotPoolsListProps> = ({ pools }) => {
  const safePools = Array.isArray(pools) ? pools : [];
  const imagesPreloadedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Preload all token images when pools data is available
    if (safePools && safePools.length > 0 && !imagesPreloadedRef.current) {
      const urls = safePools
        .map(pool => [
          pool.mainToken?.logo, 
          pool.sideToken?.logo
        ])
        .flat()
        .filter(url => !!url) as string[];
      
      if (urls.length > 0) {
        console.log(`Preloading ${urls.length} token images from HotPoolsList component`);
        imagesPreloadedRef.current = true;
        preloadImages(urls, true) // Force cache the images
          .then(() => console.log('Token images preloaded and permanently cached successfully'))
          .catch(err => console.error('Error preloading token images:', err));
      }
    }
    
    // Don't reset the flag when component unmounts to avoid reloading on remount
  }, [safePools]);
  
  const formatDexName = (name?: string): string => {
    if (!name) return "Unknown";
    
    // Map of known DEX names to their proper display format
    const dexNames: {[key: string]: string} = {
      "raydium": "Raydium",
      "raydium cpmm": "Raydium",
      "raydium amm": "Raydium",
      "orca": "Orca",
      "jupiter": "Jupiter",
      "openbook": "OpenBook",
      "serum": "Serum",
      "meteora": "Meteora",
      "meteora dlmm": "Meteora",
      "lifinity": "Lifinity",
      "cykura": "Cykura",
      "aldrin": "Aldrin",
      "atrix": "Atrix",
      "step finance": "Step Finance",
      "step": "Step Finance",
      "solflare": "Solflare",
      "mango": "Mango Markets",
      "saber": "Saber",
      "marinade": "Marinade",
      "saros": "Saros",
      "symmetry": "Symmetry",
      "cropper": "Cropper",
      "tensor": "Tensor",
      "pumpswap": "PumpSwap"
    };
    
    // First check if the exact name is in our map (case-insensitive)
    const lowerName = name.toLowerCase();
    if (dexNames[lowerName]) {
      return dexNames[lowerName];
    }
    
    // Then check if any part of the name matches a known DEX
    for (const [key, value] of Object.entries(dexNames)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }
    
    // If not found in our map, capitalize the first letter of each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  if (!pools) {
    return (
      <div className="space-y-4 py-4">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-black">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>DEX</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((index) => (
              <TableRow key={index} className="border-gray-800 hover:bg-gray-900/50">
                <TableCell className="font-medium">{index}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="h-10 w-10 mr-2 bg-gray-800 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-gray-800 rounded animate-pulse"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 w-16 bg-gray-800 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 bg-gray-800 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <div className="h-8 w-16 bg-gray-800 rounded animate-pulse"></div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (safePools.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-8 text-gray-500">No hot pools found</div>
      </div>
    );
  }

  // Sort pools by rank if available, otherwise maintain the order from the API
  const sortedPools = [...safePools];

  return (
    <div className="space-y-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>DEX</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPools.map((pool, index) => {
            // Format the DEX name properly
            const dexName = formatDexName(pool.exchangeName);
            
            return (
              <TableRow key={pool.address || index} className="border-gray-800 hover:bg-gray-900/50">
                <TableCell className="font-medium">{pool.rank || (index + 1)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-2">
                      <AvatarImage 
                        src={pool.mainToken?.logo} 
                        alt={pool.mainToken?.name || "Token logo"} 
                        loading="eager" // Load immediately
                      />
                      <AvatarFallback className="bg-gray-800 text-gray-400">
                        {(pool.mainToken?.symbol || "??")?.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {pool.mainToken?.name || 'Unknown Token'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {pool.mainToken?.symbol || 'N/A'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-900/10 text-blue-400 border-blue-500/20">
                    {dexName}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(pool.creationTime)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-xs border-gray-800"
                      onClick={() => window.open(`https://solscan.io/account/${pool.address}`, '_blank')}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default HotPoolsList;
