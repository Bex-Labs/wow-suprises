-- ============================================
-- STEP 2: CREATE ADMIN ACTIVITY LOGS TABLE
-- Table to track all admin actions for audit trail
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id 
ON admin_activity_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at 
ON admin_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_action 
ON admin_activity_logs(action);

-- Add comments
COMMENT ON TABLE admin_activity_logs IS 'Logs all admin activities for audit trail';
COMMENT ON COLUMN admin_activity_logs.action IS 'Action type: login, logout, update_booking_status, etc.';
COMMENT ON COLUMN admin_activity_logs.metadata IS 'Additional data related to the action';

-- Success message
SELECT '✅ Step 2 Complete: Admin activity logs table created' AS status;