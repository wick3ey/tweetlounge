
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ManualCacheRefresh: React.FC = () => {
  const handleManualRefresh = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('refreshCache', {
        method: 'POST',
        // Du kan lägga till headers här om det behövs
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error('Cache refresh error:', error);
        toast({
          title: 'Cache Refresh Failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        console.log('Cache refresh response:', data);
        toast({
          title: 'Cache Refreshed',
          description: 'Market data cache has been successfully updated',
        });
      }
    } catch (err) {
      console.error('Unexpected error during cache refresh:', err);
      toast({
        title: 'Refresh Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <button 
      onClick={handleManualRefresh} 
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Refresh Market Cache
    </button>
  );
};

export default ManualCacheRefresh;
