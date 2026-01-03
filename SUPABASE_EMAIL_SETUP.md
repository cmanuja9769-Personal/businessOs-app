# Supabase Email Confirmation Setup

## Issue
Users created via signup are not immediately visible in Supabase because **email confirmation is enabled by default**.

## Solution Options

### Option 1: Disable Email Confirmation (Development Only)
For local development and testing:

1. Open your Supabase Dashboard
2. Go to **Authentication** → **Providers** → **Email**
3. Scroll down to **Email Confirmation**
4. **Uncheck** "Enable email confirmations"
5. Click **Save**

Now users will be created immediately without needing email verification.

### Option 2: Configure Email Provider (Production)
For production with email confirmation:

1. Go to **Authentication** → **Email Templates**
2. Configure your email templates (confirmation, password reset, etc.)
3. Go to **Project Settings** → **Auth**
4. Configure SMTP settings or use Supabase's built-in email service
5. Set **Site URL** to your production domain (e.g., `https://yourdomain.com`)
6. Set **Redirect URLs** to include:
   - `https://yourdomain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### Option 3: Auto-Confirm in Development
Update your local Supabase settings:

1. In Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Enable **"Skip email confirmation for new signups"** (development mode)

## Current App Behavior

The signup flow now:
- ✅ Creates user in `auth.users`
- ✅ Creates user role in `user_roles` table
- ✅ Detects if email confirmation is required
- ✅ Shows appropriate message:
  - If confirmation needed → redirects to login with "check email" message
  - If auto-confirmed → redirects to onboarding

## Checking User Creation

To verify users are being created in Supabase:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Look for users with status:
   - **"Confirmed"** - email verified, can login
   - **"Unconfirmed"** - waiting for email verification
3. If you don't see users at all, check:
   - Browser console for signup errors
   - Supabase logs for API errors
   - RLS policies (make sure inserts are allowed)

## Database Tables

Your app uses these tables:
- `auth.users` - Supabase managed auth table
- `user_roles` - Custom table for roles (admin, user, salesperson, etc.)
- `app_user_organizations` - Links users to organizations
- `app_organizations` - Organization data

## Testing

1. Sign up with a new email
2. Check Supabase Dashboard → Authentication → Users
3. If "Enable email confirmations" is OFF:
   - User should appear as "Confirmed" immediately
   - You can login right away
4. If "Enable email confirmations" is ON:
   - User appears as "Unconfirmed"
   - Check email for confirmation link
   - Click link to confirm
   - User status changes to "Confirmed"
   - Now you can login

## Row Level Security (RLS)

If users still don't appear, check RLS policies:

```sql
-- Check if RLS is enabled on user_roles
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_roles';

-- If RLS is blocking inserts, add policy:
CREATE POLICY "Users can create their own role"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
