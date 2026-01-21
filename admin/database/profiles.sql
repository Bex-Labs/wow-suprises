-- ============================================
-- STEP 1: UPDATE PROFILES TABLE
-- Add admin role support to existing profiles table
-- ============================================

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'client';
    END IF;
END $$;

-- Add check constraint for role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('client', 'admin'));
    END IF;
END $$;

-- Add permissions column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE profiles ADD COLUMN permissions TEXT[] DEFAULT ARRAY['all'];
    END IF;
END $$;

-- Add status column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Add check constraint for status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_status_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
        CHECK (status IN ('active', 'suspended'));
    END IF;
END $$;

-- Update existing users to have 'client' role if NULL
UPDATE profiles SET role = 'client' WHERE role IS NULL;

-- Add comments
COMMENT ON COLUMN profiles.role IS 'User role: client or admin';
COMMENT ON COLUMN profiles.permissions IS 'Admin permissions array';
COMMENT ON COLUMN profiles.status IS 'Account status: active or suspended';

-- Success message
SELECT '✅ Step 1 Complete: Profiles table updated with admin support' AS status;