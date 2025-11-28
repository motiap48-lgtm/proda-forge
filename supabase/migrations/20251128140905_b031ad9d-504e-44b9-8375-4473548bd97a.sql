-- Fix missing refresh_token_hmac_key column in auth.sessions table
-- This is required for Supabase Auth to properly handle token refresh

-- Add missing column to auth.sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'sessions' 
    AND column_name = 'refresh_token_hmac_key'
  ) THEN
    ALTER TABLE auth.sessions 
    ADD COLUMN refresh_token_hmac_key text;
    
    COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'HMAC key for refresh token validation';
  END IF;
END $$;