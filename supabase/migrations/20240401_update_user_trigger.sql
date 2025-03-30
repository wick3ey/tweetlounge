
-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that handles username uniqueness
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  username_to_use TEXT;
  base_username TEXT;
  username_counter INT := 0;
  is_unique BOOLEAN := FALSE;
BEGIN
  -- Get username from metadata if provided
  username_to_use := NEW.raw_user_meta_data->>'username';
  
  -- If username isn't provided, create one from email
  IF username_to_use IS NULL THEN
    base_username := SPLIT_PART(NEW.email, '@', 1);
    username_to_use := base_username;
  ELSE
    base_username := username_to_use;
  END IF;
  
  -- Loop to find a unique username if needed
  WHILE NOT is_unique AND username_counter < 100 LOOP
    -- Check if username already exists
    PERFORM id FROM public.profiles WHERE username = username_to_use;
    
    IF FOUND THEN
      -- Increment counter and try a new username
      username_counter := username_counter + 1;
      username_to_use := base_username || username_counter;
    ELSE
      is_unique := TRUE;
    END IF;
  END LOOP;
  
  -- Create profile with the unique username
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name, 
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    username_to_use,
    COALESCE(NEW.raw_user_meta_data->>'display_name', username_to_use),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create or update conversation timestamp triggers
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update timestamp for the conversation
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Reset is_read flag for the other participant
  UPDATE conversation_participants
  SET is_read = FALSE
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_conversation_on_message'
  ) THEN
    CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
  END IF;
END
$$;

-- Create an optimized function to get user conversations in a single query
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ, 
  updated_at TIMESTAMPTZ,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  sender_id UUID,
  other_user_id UUID,
  other_user_username TEXT,
  other_user_display_name TEXT,
  other_user_avatar TEXT,
  other_user_avatar_nft_id TEXT,
  other_user_avatar_nft_chain TEXT,
  other_user_bio TEXT,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_convos AS (
    -- All conversations the user is part of
    SELECT cp.conversation_id, cp.is_read, cp.last_read_at
    FROM conversation_participants cp
    WHERE cp.user_id = user_uuid
  ),
  other_users AS (
    -- All other users in these conversations
    SELECT 
      cp.conversation_id,
      cp.user_id AS other_user_id
    FROM conversation_participants cp
    JOIN user_convos uc ON cp.conversation_id = uc.conversation_id
    WHERE cp.user_id <> user_uuid
  ),
  last_messages AS (
    -- Latest message for each conversation
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content AS last_message,
      m.created_at AS last_message_time,
      m.sender_id
    FROM messages m
    JOIN user_convos uc ON m.conversation_id = uc.conversation_id
    WHERE m.is_deleted = false
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Count of unread messages
    SELECT 
      m.conversation_id,
      COUNT(*) AS unread_count
    FROM messages m
    JOIN user_convos uc ON m.conversation_id = uc.conversation_id
    WHERE 
      m.sender_id <> user_uuid AND
      (uc.is_read = false OR (uc.last_read_at IS NULL OR m.created_at > uc.last_read_at))
    GROUP BY m.conversation_id
  )
  SELECT
    c.id,
    c.created_at,
    c.updated_at,
    lm.last_message,
    lm.last_message_time,
    lm.sender_id,
    ou.other_user_id,
    p.username AS other_user_username,
    p.display_name AS other_user_display_name,
    p.avatar_url AS other_user_avatar,
    p.avatar_nft_id AS other_user_avatar_nft_id,
    p.avatar_nft_chain AS other_user_avatar_nft_chain,
    p.bio AS other_user_bio,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM conversations c
  JOIN user_convos uc ON c.id = uc.conversation_id
  JOIN other_users ou ON c.id = ou.conversation_id
  LEFT JOIN profiles p ON ou.other_user_id = p.id
  LEFT JOIN last_messages lm ON c.id = lm.conversation_id
  LEFT JOIN unread_counts uc ON c.id = uc.conversation_id
  ORDER BY COALESCE(lm.last_message_time, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql;
