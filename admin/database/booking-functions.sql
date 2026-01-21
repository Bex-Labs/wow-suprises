-- ============================================
-- STEP 4: UPDATE BOOKINGS TABLE & HELPER FUNCTIONS
-- Add admin fields to bookings and create useful functions
-- ============================================

-- Add admin fields to bookings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE bookings ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'assigned_admin_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN assigned_admin_id UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN bookings.admin_notes IS 'Internal notes visible only to admins';
COMMENT ON COLUMN bookings.assigned_admin_id IS 'Admin assigned to handle this booking';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_admin ON bookings(assigned_admin_id);

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND role = 'admin'
        AND status = 'active'
    );
END;
$$;

COMMENT ON FUNCTION is_admin IS 'Check if a given user ID belongs to an active admin';

-- Create helper function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_id UUID,
    p_action TEXT,
    p_details TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_activity_logs (
        admin_id,
        action,
        details,
        metadata
    )
    VALUES (
        p_admin_id,
        p_action,
        p_details,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_admin_activity IS 'Helper function to log admin activities';

-- Success message
SELECT '✅ Step 4 Complete: Bookings table updated and helper functions created' AS status;