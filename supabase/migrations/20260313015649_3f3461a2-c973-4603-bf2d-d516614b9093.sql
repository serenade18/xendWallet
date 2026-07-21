
CREATE OR REPLACE FUNCTION public.search_users(query text)
RETURNS TABLE(email text, phone text, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.email,
    p.phone,
    COALESCE(
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.user_id),
      p.email
    ) as name
  FROM public.profiles p
  WHERE p.wallet_address IS NOT NULL
    AND (
      p.email ILIKE '%' || query || '%'
      OR p.phone ILIKE '%' || query || '%'
    )
  LIMIT 10;
$$;
