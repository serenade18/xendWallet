
-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create function to look up wallet by phone number
CREATE OR REPLACE FUNCTION public.get_wallet_by_phone(lookup_phone text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT wallet_address
  FROM public.profiles
  WHERE phone = trim(lookup_phone)
  LIMIT 1;
$$;

-- Create function to get email by phone
CREATE OR REPLACE FUNCTION public.get_phone_by_wallet(wallet text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT phone
  FROM public.profiles
  WHERE wallet_address = wallet
  LIMIT 1;
$$;

-- Update handle_new_user to also store phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, phone)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$;
