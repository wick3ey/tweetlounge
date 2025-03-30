import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Search, Check } from 'lucide-react';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { useAuth } from '@/contexts/AuthContext';
import { VerifiedBadge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { startConversation } from '@/services/messageService';
import { useToast } from '@/components/ui/use-toast';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  selectedConversationId, 
  onSelectConversation 
}) => {
  const { conversations, loading } = useRealtimeConversations();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show the time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If this week, show the day name
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return format(date, 'EEE');
    }
    
    // Otherwise show the date
    return format(date, 'MM/dd/yy');
  };
  
  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    try {
      const { data, error } = await supabase
        .rpc('search_users', { search_term: term, limit_count: 5 });
      
      if (error) throw error;
      
      // Filter out the current user
      const filteredResults = data.filter(profile => profile.id !== user?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Could not search for users',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };
  
  const handleNewConversation = async (userId: string) => {
    try {
      const conversationId = await startConversation(userId);
      setShowNewMessageDialog(false);
      setSearchTerm('');
      setSearchResults([]);
      
      // Select the new conversation
      onSelectConversation(conversationId);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const filteredConversations = searchTerm
    ? conversations.filter(conv => 
        conv.other_user_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.other_user_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : conversations;

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Messages</h2>
          <Button variant="ghost" size="icon">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-crypto-lightgray" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b border-crypto-gray">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="ml-3 flex-grow">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-10 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Messages</h2>
        <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-crypto-blue hover:text-crypto-blue/80 hover:bg-crypto-darkgray"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-crypto-darkgray border-crypto-gray">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-crypto-lightgray" />
                <Input
                  placeholder="Search people"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="pl-9 bg-crypto-black border-crypto-gray"
                />
              </div>
              
              {searching && (
                <div className="py-3 text-center text-crypto-lightgray">
                  Searching...
                </div>
              )}
              
              {!searching && searchResults.length === 0 && searchTerm.trim() !== '' && (
                <div className="py-3 text-center text-crypto-lightgray">
                  No users found
                </div>
              )}
              
              {!searching && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center p-2 rounded hover:bg-crypto-black cursor-pointer"
                      onClick={() => handleNewConversation(user.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                          {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <p className="font-semibold">{user.display_name || user.username}</p>
                          {user.avatar_nft_id && (
                            <VerifiedBadge className="ml-1" />
                          )}
                        </div>
                        <p className="text-sm text-crypto-lightgray">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-crypto-lightgray" />
          <Input
            placeholder="Search messages"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-crypto-black border-crypto-gray"
          />
        </div>
      </div>
      
      <Separator className="bg-crypto-gray" />
      
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-grow p-6 text-crypto-lightgray">
          <PlusCircle className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-center">No conversations yet</p>
          <Button 
            variant="outline" 
            className="mt-4 border-crypto-gray text-crypto-blue hover:bg-crypto-gray/20"
            onClick={() => setShowNewMessageDialog(true)}
          >
            Start a new message
          </Button>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-grow p-6 text-crypto-lightgray">
          <Search className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-center">No conversations match your search</p>
          <Button 
            variant="outline" 
            className="mt-4 border-crypto-gray"
            onClick={() => setSearchTerm('')}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filteredConversations.map(conversation => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`block p-4 border-b border-crypto-gray hover:bg-crypto-darkgray transition-colors cursor-pointer ${
                conversation.id === selectedConversationId ? 'bg-crypto-darkgray' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.other_user_avatar || ''} />
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {conversation.other_user_display_name?.[0]?.toUpperCase() || 
                       conversation.other_user_username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-crypto-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </div>
                  )}
                </div>
                
                <div className="ml-3 flex-grow overflow-hidden">
                  <div className="flex items-center mb-1">
                    <h3 className="font-semibold truncate mr-1">
                      {conversation.other_user_display_name || conversation.other_user_username || 'Unknown User'}
                    </h3>
                    {conversation.other_user_avatar_nft_id && (
                      <VerifiedBadge className="flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center text-crypto-lightgray">
                    <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-semibold text-white' : ''}`}>
                      {conversation.last_message || 'No messages yet'}
                    </p>
                    {conversation.sender_id === user?.id && conversation.last_message && (
                      <Check className="h-4 w-4 ml-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-crypto-lightgray whitespace-nowrap ml-2">
                  {conversation.updated_at ? formatTime(conversation.updated_at) : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
