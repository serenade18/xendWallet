-- Revert the broad policy and restore own-profile access
DROP POLICY IF EXISTS "Authenticated users can look up wallet addresses by email" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a secure function to look up wallet address by email
CREATE OR REPLACE FUNCTION public.get_wallet_by_email(lookup_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address
  FROM public.profiles
  WHERE email = lower(trim(lookup_email))
  LIMIT 1;
$$;