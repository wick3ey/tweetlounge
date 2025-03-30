
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { startConversation } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, PlusCircle, Settings, Calendar, Mail, Plus } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/components/ui/use-toast';

// User search type
interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  similarity: number;
}

const ConversationList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, loading, error } = useRealtimeConversations();
  const { user } = useAuth();
  const { conversationId: activeConversationId } = useParams<{ conversationId?: string }>();
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [startingConversation, setStartingConversation] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const truncateMessage = (message: string, length = 30) => 
    message.length > length ? message.substring(0, length) + '...' : message;

  const getDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      // Today, show time
      return format(date, 'h:mm a');
    } else if (date.getFullYear() === now.getFullYear()) {
      // This year, show month and day
      return format(date, 'MMM d');
    } else {
      // Different year, show month and year
      return format(date, 'MMM yyyy');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.participants?.[0];
    const displayName = otherUser?.display_name || otherUser?.username || '';
    const username = otherUser?.username || '';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Search for users
  const searchUsers = async () => {
    if (!userSearchTerm.trim()) return;
    
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .rpc('search_users', { 
          search_term: userSearchTerm, 
          limit_count: 5 
        });
        
      if (error) throw error;
      setUserSearchResults(data);
    } catch (err) {
      console.error('Error searching users:', err);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } finally {
      setSearchingUsers(false);
    }
  };

  // Start a new conversation
  const handleStartConversation = async () => {
    if (!selectedUser) return;
    
    setStartingConversation(true);
    try {
      const conversationId = await startConversation(selectedUser.id);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
        setIsNewMessageDialogOpen(false);
        setSelectedUser(null);
        setUserSearchTerm('');
        setUserSearchResults([]);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    } finally {
      setStartingConversation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b border-crypto-gray">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="text-crypto-lightgray">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-crypto-lightgray">
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="p-3">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex-grow overflow-y-auto">
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-crypto-gray">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-crypto-gray">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center text-red-500 p-6">
            <div className="text-4xl mb-4">😢</div>
            <p className="mb-4">Error loading conversations</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // New Message Dialog
  const renderNewMessageDialog = () => (
    <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Search for a user to start a conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 my-4">
          <div className="relative flex-1">
            <Input
              placeholder="Search by username or name"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-full"
              onClick={searchUsers}
              disabled={searchingUsers || !userSearchTerm.trim()}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {searchingUsers ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center p-2 border rounded-md">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-3 space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : userSearchResults.length > 0 ? (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {userSearchResults.map(result => (
              <div 
                key={result.id}
                className={`flex items-center p-2 border rounded-md cursor-pointer ${
                  selectedUser?.id === result.id ? 'bg-crypto-blue/10 border-crypto-blue' : 'hover:bg-crypto-darkgray'
                }`}
                onClick={() => setSelectedUser(result)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={result.avatar_url || ''} />
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                    {result.display_name?.[0] || result.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="font-medium">{result.display_name || result.username}</div>
                  <div className="text-sm text-crypto-lightgray">@{result.username}</div>
                </div>
              </div>
            ))}
          </div>
        ) : userSearchTerm && !searchingUsers ? (
          <div className="py-4 text-center text-crypto-lightgray">
            <span className="text-lg">🔍</span>
            <p>No users found</p>
          </div>
        ) : null}
        
        <DialogFooter>
          <Button
            onClick={handleStartConversation}
            disabled={startingConversation || !selectedUser}
            className="w-full sm:w-auto"
          >
            {startingConversation ? 'Starting...' : 'Start Conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex justify-between items-center border-b border-crypto-gray">
        <h1 className="text-xl font-bold">Messages</h1>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-crypto-lightgray hover:text-crypto-text hover:bg-crypto-darkgray">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-crypto-lightgray hover:text-crypto-text hover:bg-crypto-darkgray">
            <Mail className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-crypto-lightgray h-4 w-4" />
          <Input
            placeholder="Search Direct Messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-crypto-darkgray border-none"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {filteredConversations.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center p-8 text-crypto-lightgray">
            <MessageSquare className="h-12 w-12 mb-4 text-crypto-gray" />
            <p className="font-medium mb-2">No conversations yet</p>
            <p className="text-sm text-center">Start a conversation with another user to see it here</p>
          </div>
        )}

        {filteredConversations.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center p-8 text-crypto-lightgray">
            <Search className="h-12 w-12 mb-4 text-crypto-gray" />
            <p className="font-medium mb-2">No conversations found</p>
            <p className="text-sm text-center">Try a different search term or start a new conversation</p>
          </div>
        )}

        <div className="divide-y divide-crypto-gray">
          {filteredConversations.map(conv => {
            const otherUser = conv.participants?.[0];
            const isRead = true; // We'll add unread indicator later
            const isActive = conv.id === activeConversationId;
            
            return (
              <Link 
                key={conv.id} 
                to={`/messages/${conv.id}`} 
                className={`block p-4 transition-colors ${
                  isActive 
                    ? 'bg-crypto-blue/10' 
                    : 'hover:bg-crypto-darkgray'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12 rounded-full">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {otherUser?.display_name?.[0] || otherUser?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center max-w-[70%]">
                        <h3 className={`font-medium truncate ${!isRead ? 'text-crypto-blue' : ''}`}>
                          {otherUser?.display_name || otherUser?.username}
                        </h3>
                        {otherUser?.ethereum_address && (
                          <VerifiedBadge className="ml-1 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-crypto-lightgray flex-shrink-0">
                        {conv.updated_at && getDateDisplay(conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate text-crypto-lightgray ${!isRead ? 'text-crypto-text font-medium' : ''}`}>
                        {conv.lastMessage 
                          ? conv.lastMessage.is_deleted 
                            ? <span className="italic">Message was deleted</span>
                            : truncateMessage(conv.lastMessage.content)
                          : 'Start a conversation'
                        }
                      </p>
                      {!isRead && (
                        <Badge variant="default" className="bg-crypto-blue h-2 w-2 rounded-full p-0 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-crypto-gray">
        <Button 
          className="w-full bg-crypto-blue hover:bg-crypto-darkblue"
          onClick={() => setIsNewMessageDialogOpen(true)}
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          New Message
        </Button>
      </div>

      {renderNewMessageDialog()}
    </div>
  );
};

export default ConversationList;
