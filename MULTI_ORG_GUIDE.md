# Multi-Organization Setup Guide

## What's New

✅ **Multiple Organizations Support**
- Users can now create and belong to multiple organizations
- Switch between organizations using the dropdown in the header
- Each organization has its own data (customers, invoices, items, etc.)

✅ **Organization Management Page**
- New "Organizations" menu in sidebar
- View all your organizations
- Create new organizations anytime
- See your role in each organization (owner/admin/member)

✅ **User Invitation System**
- Owners and admins can invite users to join their organization
- Invitations support different roles (owner/admin/member)
- Existing users are added immediately
- New users receive invitation tokens (email integration pending)

## Database Setup Required

Run this SQL in **Supabase SQL Editor** to enable the invitation system:

```sql
-- Create organization_invitations table
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

CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE organization_id = organization_invitations.organization_id
      AND user_id = auth.uid()
      AND (role = 'owner' OR role = 'admin')
    )
  );

CREATE POLICY "Organization admins can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE organization_id = organization_invitations.organization_id
      AND user_id = auth.uid()
      AND (role = 'owner' OR role = 'admin')
    )
  );
```

## User Flow

### Creating Organizations

1. **First Organization** (Onboarding)
   - Sign up → Auto-redirect to `/onboarding`
   - Create your first organization
   - You become the owner

2. **Additional Organizations**
   - Click "Organizations" in sidebar
   - Click "+ New Organization"
   - Fill in details
   - You become the owner of this org too

### Switching Organizations

- Use the **organization dropdown** in the header
- All data (customers, invoices, etc.) switches to the selected org
- Your selection is saved in localStorage

### Inviting Users

1. Go to **Organizations** page
2. Click **"Invite"** on any org where you're owner/admin
3. Enter email and select role:
   - **Owner** - Full control
   - **Admin** - Can manage members and settings
   - **Member** - Can access organization resources
4. If user exists → Added immediately
5. If user doesn't exist → Invitation created (email pending)

### Managing Members

1. Go to **Organizations** → Click **"Settings"** on an org
2. View **"Members"** tab
3. See all members with their roles
4. Invite new members (if you're owner/admin)

## Roles Explained

### User Roles (System-wide)
- `admin` - System admin (can access /users page)
- `user` - Regular user
- `salesperson`, `accountant`, `viewer` - Other system roles

### Organization Roles (Per-Organization)
- `owner` - Created the org, full control
- `admin` - Can invite users, manage settings
- `member` - Can access org data

**Note:** A user can be a system `admin` but only a `member` in a specific organization.

## Testing the Flow

1. **Create a 2nd organization:**
   ```
   Organizations → + New Organization → Fill form → Create
   ```

2. **Switch organizations:**
   ```
   Header dropdown → Select different org → Data updates
   ```

3. **Invite a user:**
   ```
   Organizations → Invite button → Enter email → Send
   ```

4. **Check it worked:**
   ```
   Organizations → Settings → Members tab → See new member
   ```

## Next Steps (Future Enhancements)

- 📧 Email notifications for invitations
- 🔗 Invitation acceptance page with token verification
- 👤 User profile page showing all organizations
- 🗑️ Leave/delete organizations
- 🔒 More granular permissions per organization
- 📊 Organization-level analytics

## Troubleshooting

**Problem:** Can't create 2nd organization
- **Solution:** Make sure you ran the onboarding page update (removed the redirect)

**Problem:** Invitation fails with "requires database setup"
- **Solution:** Run the SQL script above to create `organization_invitations` table

**Problem:** Can't see "Invite" button
- **Solution:** You must be owner or admin of the organization

**Problem:** User doesn't appear after invitation
- **Solution:** If user doesn't exist yet, they need to sign up first. Email system not implemented yet.
