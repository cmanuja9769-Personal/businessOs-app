-- Create organization_invitations table for user invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT organization_invitations_role_check CHECK (
    role IN ('owner', 'admin', 'member')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires_at ON organization_invitations(expires_at);

-- Enable RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE organization_id = organization_invitations.organization_id
      AND user_id = auth.uid()
      AND (role = 'owner' OR role = 'admin')
    )
  );

CREATE POLICY "Organization admins can create invitations"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE organization_id = organization_invitations.organization_id
      AND user_id = auth.uid()
      AND (role = 'owner' OR role = 'admin')
    )
  );

CREATE POLICY "Users can accept their own invitations"
  ON organization_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM organization_invitations
  WHERE expires_at < NOW() AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations()');
