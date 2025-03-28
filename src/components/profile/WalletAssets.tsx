
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, ExternalLink } from 'lucide-react';
import { fetchWalletTokens, Token } from '@/utils/tokenService';

interface WalletAssetsProps {
  ethereumAddress?: string | null;
  solanaAddress?: string | null;
}

const WalletAssets = ({ ethereumAddress, solanaAddress }: WalletAssetsProps) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let allTokens: Token[] = [];
        
        // Fetch tokens for Solana address if available
        if (solanaAddress) {
          const solTokens = await fetchWalletTokens(solanaAddress, 'solana');
          allTokens = [...allTokens, ...solTokens];
        }
        
        // Fetch tokens for Ethereum address if available
        if (ethereumAddress) {
          const ethTokens = await fetchWalletTokens(ethereumAddress, 'ethereum');
          allTokens = [...allTokens, ...ethTokens];
        }
        
        setTokens(allTokens);
      } catch (err) {
        console.error('Error fetching wallet tokens:', err);
        setError('Failed to load tokens. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTokens();
  }, [ethereumAddress, solanaAddress]);

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
        <div className="text-red-500 mb-4">{error}</div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-gray-500 mb-4">No tokens found in connected wallets.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Wallet Assets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <Card key={token.symbol + token.address} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                {token.logo ? (
                  <img 
                    src={token.logo} 
                    alt={token.name} 
                    className="h-12 w-12 rounded-full mr-4 object-cover bg-gray-100"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full mr-4 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-bold">{token.symbol?.substring(0, 2) || '??'}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{token.name || token.symbol}</h3>
                  <p className="text-gray-500 text-sm">{token.symbol}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-semibold">{parseFloat(token.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                  {token.usdValue && (
                    <p className="text-gray-500 text-sm">${parseFloat(token.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  )}
                </div>
              </div>
              {token.explorerUrl && (
                <div className="border-t px-4 py-2 bg-gray-50">
                  <a 
                    href={token.explorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-twitter-blue hover:underline text-sm flex items-center"
                  >
                    View on {token.chain === 'solana' ? 'Solscan' : 'Etherscan'}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WalletAssets;
