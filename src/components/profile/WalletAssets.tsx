
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { fetchWalletTokens, Token } from '@/utils/tokenService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WalletAssetsProps {
  solanaAddress?: string | null;
}

const WalletAssets = ({ solanaAddress }: WalletAssetsProps) => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = async () => {
    setIsLoading(true);
    setError(null);
    setTokens([]);
    
    try {
      if (solanaAddress) {
        console.log(`Attempting to fetch Solana tokens for: ${solanaAddress}`);
        try {
          const solTokens = await fetchWalletTokens(solanaAddress);
          console.log('Solana tokens response:', solTokens);
          if (solTokens && solTokens.length > 0) {
            console.log(`Successfully retrieved ${solTokens.length} Solana tokens`);
            setTokens(solTokens);
          } else {
            console.log('No Solana tokens found or returned');
          }
        } catch (err) {
          console.error('Error fetching Solana tokens:', err);
          toast({
            title: "Error loading Solana tokens",
            description: "There was a problem fetching your Solana tokens.",
            variant: "destructive"
          });
          setError('Failed to load Solana tokens. Please try again later.');
        }
      }
      
      if (tokens.length === 0 && solanaAddress) {
        setError('No tokens found for your connected wallet. If you believe this is an error, please try again.');
      }
    } catch (err) {
      console.error('Error in loadTokens function:', err);
      setError('Failed to load tokens. Please try again later.');
      toast({
        title: "Error loading tokens",
        description: "There was a problem fetching your wallet assets. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (solanaAddress) {
      loadTokens();
    } else {
      setIsLoading(false);
    }
  }, [solanaAddress]);

  const handleRetry = () => {
    loadTokens();
  };

  // Function to determine which URL to use for a token
  const getTokenUrl = (token: Token) => {
    // For unknown tokens (address-formatted names), use DexScreener
    return token.name.includes('...') ? token.dexScreenerUrl : token.explorerUrl;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Loading Assets...</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-4">
                  <Skeleton className="h-12 w-12 rounded-full mr-4" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="ml-auto">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={handleRetry} variant="outline">Retry</Button>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-gray-500 mb-4">No tokens found in connected wallet.</div>
        {solanaAddress && (
          <Button onClick={handleRetry} variant="outline" size="sm">
            Refresh
          </Button>
        )}
      </div>
    );
  }

  const totalUsdValue = tokens.reduce((sum, token) => {
    const tokenValue = token.usdValue ? parseFloat(token.usdValue) : 0;
    return sum + tokenValue;
  }, 0);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Solana Assets</h2>
        {totalUsdValue > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="font-semibold text-lg">${totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:hidden">
        {tokens.map((token) => (
          <Card key={token.symbol + token.address} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                {token.logo ? (
                  <img 
                    src={token.logo} 
                    alt={token.name} 
                    className="h-12 w-12 rounded-full mr-4 object-cover bg-gray-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/100x100/gray/white?text=${token.symbol?.substring(0, 2) || '??'}`;
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full mr-4 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-bold">{token.symbol?.substring(0, 2) || '??'}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{token.name}</h3>
                  <p className="text-gray-500 text-sm">{token.symbol}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-semibold">{parseFloat(token.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                  {token.usdValue && (
                    <p className="text-gray-500 text-sm">${parseFloat(token.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  )}
                </div>
              </div>
              {(token.explorerUrl || token.dexScreenerUrl) && (
                <div className="border-t px-4 py-2 bg-gray-50">
                  <a 
                    href={getTokenUrl(token)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-twitter-blue hover:underline text-sm flex items-center"
                  >
                    {token.name.includes('...') ? 'View on DexScreener' : 'View on Solscan'}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.symbol + token.address}>
                  <TableCell>
                    <div className="flex items-center">
                      {token.logo ? (
                        <img 
                          src={token.logo} 
                          alt={token.name} 
                          className="h-8 w-8 rounded-full mr-3 object-cover bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/100x100/gray/white?text=${token.symbol?.substring(0, 2) || '??'}`;
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full mr-3 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-bold text-sm">{token.symbol?.substring(0, 2) || '??'}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-gray-500 text-xs">{token.symbol}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {parseFloat(token.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {token.usdValue ? (
                      `$${parseFloat(token.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {(token.explorerUrl || token.dexScreenerUrl) && (
                      <a 
                        href={getTokenUrl(token)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-twitter-blue hover:underline text-sm flex items-center justify-end"
                      >
                        View
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          className="flex items-center gap-2"
        >
          <Loader className="h-3 w-3" />
          Refresh Data
        </Button>
      </div>
    </div>
  );
};

export default WalletAssets;
