CREATE POLICY "Authenticated users can look up wallet addresses by email"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;