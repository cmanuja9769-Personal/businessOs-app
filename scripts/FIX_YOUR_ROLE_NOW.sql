-- IMMEDIATE FIX: Run this SQL in Supabase SQL Editor
-- This will create an admin role for your user right now

-- For user: cmanuja123@live.com (ID: 8223e8f5-d0df-4a15-83f2-36b4d79de0a6)
INSERT INTO user_roles (user_id, role, permissions)
VALUES ('8223e8f5-d0df-4a15-83f2-36b4d79de0a6', 'admin', '{}')
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW()
RETURNING *;

-- Verify it was created:
SELECT * FROM user_roles WHERE user_id = '8223e8f5-d0df-4a15-83f2-36b4d79de0a6';
