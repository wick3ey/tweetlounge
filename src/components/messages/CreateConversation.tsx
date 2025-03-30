
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Search, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { startConversation } from '@/services/messageService';

const CreateConversation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        toast({
          title: 'Error',
          description: 'Could not search for users',
          variant: 'destructive'
        });
        return;
      }

      setSearchResults(data || []);
    } catch (err) {
      console.error('Unexpected error during search:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    setIsCreating(true);
    try {
      const conversationId = await startConversation(userId);
      
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
        toast({
          title: 'Success',
          description: 'Conversation started',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to start conversation',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast({
        title: 'Error',
        description: 'An error occurred while creating the conversation',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Start a conversation</h2>
      
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search for users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="bg-crypto-black border-crypto-gray"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          className="bg-crypto-blue hover:bg-crypto-blue/80"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-2 mt-4">
        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="text-center py-4">
            <p className="text-crypto-lightgray">No users found</p>
          </div>
        )}
        
        {searchResults.map((user) => (
          <div key={user.id} className="flex items-center justify-between bg-crypto-darkgray p-3 rounded-lg">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                  {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user.display_name || user.username}</p>
                {user.username && <p className="text-sm text-crypto-lightgray">@{user.username}</p>}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartConversation(user.id)}
              disabled={isCreating}
              className="border-crypto-gray hover:bg-crypto-darkgray/80"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Message
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateConversation;
