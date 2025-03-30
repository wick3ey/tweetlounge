
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
