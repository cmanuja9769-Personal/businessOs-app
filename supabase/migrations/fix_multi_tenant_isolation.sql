-- Fix user_roles to be org-scoped and fix admin RLS policy

-- Add organization_id column to user_roles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on user_roles for org-scoped lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON user_roles(user_id, organization_id);

-- Drop the dangerous cross-tenant admin policy
DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON user_roles;

-- Create a properly scoped admin policy
CREATE POLICY "Admins can manage roles in their own organization"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN app_user_organizations auo ON auo.user_id = ur.user_id AND auo.organization_id = ur.organization_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
        AND ur.organization_id = user_roles.organization_id
    )
  );

-- Add unique constraint for user + org role (prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_org_unique'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_org_unique UNIQUE (user_id, organization_id);
  END IF;
END $$;

-- Ensure organization_invitations has proper foreign key to app_organizations
-- (for join queries in the accept-invite flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_invitations' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE organization_invitations ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add RLS policy so users can read invitations addressed to their email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_invitations' AND policyname = 'Users can view their own invitations'
  ) THEN
    CREATE POLICY "Users can view their own invitations"
      ON organization_invitations
      FOR SELECT
      USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
  END IF;
END $$;
