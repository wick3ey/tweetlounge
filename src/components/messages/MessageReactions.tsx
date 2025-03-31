
import React, { useState, useEffect } from 'react';
import { Smile, ThumbsUp, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface MessageReactionsProps {
  messageId: string;
}

const reactionTypes = [
  { type: '👍', icon: <ThumbsUp className="h-4 w-4" /> },
  { type: '❤️', icon: <Heart className="h-4 w-4" /> },
  { type: '😊', icon: <Smile className="h-4 w-4" /> },
];

export default function MessageReactions({ messageId }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (messageId) {
      fetchReactions();
    }
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const addReaction = async (reactionType: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to react to messages',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if the user already has this reaction
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove the reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction_type: reactionType
          });

        if (error) throw error;
      }

      // Refresh reactions
      fetchReactions();
      setIsOpen(false);
    } catch (error) {
      console.error('Error managing reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add/remove reaction',
        variant: 'destructive',
      });
    }
  };

  // Group reactions by type
  const reactionCounts = reactions.reduce((acc: Record<string, number>, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex space-x-1 mt-1">
      {Object.entries(reactionCounts).map(([type, count]) => (
        <div 
          key={type} 
          className="inline-flex items-center bg-gray-800 rounded-full px-2 py-1 text-xs cursor-pointer hover:bg-gray-700"
          onClick={() => user && addReaction(type)}
        >
          <span className="mr-1">{type}</span>
          <span>{count}</span>
        </div>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full bg-gray-800 hover:bg-gray-700"
          >
            <Smile className="h-3 w-3 text-crypto-lightgray" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 bg-gray-800 border-gray-700">
          <div className="flex space-x-2 p-1">
            {reactionTypes.map(reaction => (
              <Button
                key={reaction.type}
                variant="ghost"
                size="icon"
                className="hover:bg-gray-700 rounded-full h-8 w-8"
                onClick={() => addReaction(reaction.type)}
              >
                {reaction.icon}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
