
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TokenCardSkeleton = () => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between py-2 px-4 border-b border-gray-800/40">
          <div className="flex items-center gap-3 min-w-0 w-2/3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="text-right flex-shrink-0 w-1/3 pl-2 space-y-1">
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TokenCardSkeleton;
