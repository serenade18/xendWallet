
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS noah_kyc_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS noah_kyc_customer_id text,
  ADD COLUMN IF NOT EXISTS noah_kyc_hosted_url text,
  ADD COLUMN IF NOT EXISTS noah_kyc_fiat_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS noah_kyc_updated_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_noah_kyc_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_noah_kyc_status_check
  CHECK (noah_kyc_status IN ('not_started','pending','approved','rejected'));
