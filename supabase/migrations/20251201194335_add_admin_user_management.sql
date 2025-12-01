/*
  # Admin User Management System

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `role` (text, default 'admin')
      - `created_at` (timestamptz, default now())
      - `created_by` (uuid, references admin_users)
    
    - `user_suspensions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `suspended_by` (uuid, references admin_users)
      - `reason` (text)
      - `suspended_at` (timestamptz, default now())
      - `is_active` (boolean, default true)
    
    - `admin_audit_log`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, references admin_users)
      - `action` (text, not null)
      - `target_user_id` (uuid, references auth.users)
      - `details` (jsonb)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Only admin users can access these tables
    - All actions are logged in audit log
    
  3. Important Notes
    - Admin access is controlled by the admin_users table
    - Suspensions are soft deletes (is_active flag)
    - All admin actions are audited for compliance
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suspended_by uuid REFERENCES admin_users(id) NOT NULL,
  reason text,
  suspended_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  unsuspended_at timestamptz,
  unsuspended_by uuid REFERENCES admin_users(id)
);

ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) NOT NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view all admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert admin users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete admin users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

-- RLS Policies for user_suspensions
CREATE POLICY "Admins can view all suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can create suspensions"
  ON user_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update suspensions"
  ON user_suspensions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- RLS Policies for admin_audit_log
CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert audit log entries"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions
    WHERE user_id = user_uuid
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), p_action, p_target_user_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;