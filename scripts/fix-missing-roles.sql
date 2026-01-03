-- SQL Script: Fix Missing User Roles
-- Run this in Supabase SQL Editor to create roles for users who don't have one

-- Step 1: Check users without roles
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
ORDER BY u.created_at;

-- Step 2: Create roles for users without them
-- First user gets admin, others get user role
INSERT INTO user_roles (user_id, role, permissions)
SELECT 
  u.id,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1) THEN 'admin'::text
    ELSE 'user'::text
  END as role,
  '{}'::jsonb as permissions
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify all users now have roles
SELECT 
  u.id,
  u.email,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users u
INNER JOIN user_roles ur ON u.id = ur.user_id
ORDER BY ur.created_at;

-- Step 4 (Optional): Make a specific user an admin
-- Replace 'user@example.com' with the actual email
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'cmanuja123@live.com')
RETURNING *;
