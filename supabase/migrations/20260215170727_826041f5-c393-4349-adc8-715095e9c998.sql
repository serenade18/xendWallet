
-- Add backup share storage columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS backup_share_secp text,
  ADD COLUMN IF NOT EXISTS backup_share_ed text,
  ADD COLUMN IF NOT EXISTS custodian_backup_share_secp text,
  ADD COLUMN IF NOT EXISTS custodian_backup_share_ed text,
  ADD COLUMN IF NOT EXISTS backup_status text DEFAULT 'none';

-- Add index for backup status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_backup_status ON public.profiles (backup_status);
