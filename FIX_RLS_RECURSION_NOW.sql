-- URGENT FIX: Infinite Recursion in user_roles RLS Policies
-- Run this IMMEDIATELY in Supabase SQL Editor to fix the 500 error

-- Step 1: Drop the problematic RLS policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can create their own role" ON user_roles;

-- Step 2: Create simple, non-recursive policies
-- Allow users to read their own role (no recursion)
CREATE POLICY "user_roles_select_own"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own role (for signup)
CREATE POLICY "user_roles_insert_own"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own role record (if needed)
CREATE POLICY "user_roles_update_own"
  ON user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 3: For admin access, we'll handle it at the application level
-- No need for recursive policy here

-- Step 4: Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_roles';

-- Step 5: Test that you can now query your role
SELECT * FROM user_roles WHERE user_id = auth.uid();
