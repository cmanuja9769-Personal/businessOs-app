# Supabase Setup Guide

This guide will help you configure Supabase for the Inventory Billing App.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Your project name (e.g., "inventory-billing-app")
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is fine for development

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

2. Open `.env.local` and replace the placeholder values:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   \`\`\`

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Run the SQL scripts in order:

   **a) Create Tables:**
   - Open `scripts/001_create_tables.sql`
   - Copy and paste the entire content into SQL Editor
   - Click "Run" to execute

   **b) Create Triggers:**
   - Open `scripts/002_create_triggers.sql`
   - Copy and paste the entire content into SQL Editor
   - Click "Run" to execute

   **c) Seed Dummy Data (Optional):**
   - Open `scripts/003_seed_dummy_data.sql`
   - Copy and paste the entire content into SQL Editor
   - Click "Run" to execute

## Step 5: Configure Row Level Security (RLS)

For production, you should enable Row Level Security. For now, we'll disable it for development:

1. Go to **Authentication** → **Policies** in Supabase dashboard
2. For each table (customers, items, invoices, etc.), you can:
   - **Development**: Disable RLS temporarily
   - **Production**: Create policies to control access

**Quick RLS Setup (for development):**
\`\`\`sql
-- Disable RLS for development (NOT recommended for production)
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
\`\`\`

**Production RLS Setup (recommended):**
\`\`\`sql
-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Create policies (example for customers - allow all operations)
CREATE POLICY "Allow all operations on customers"
ON public.customers
FOR ALL
USING (true)
WITH CHECK (true);
\`\`\`

## Step 6: Verify Setup

1. Restart your Next.js dev server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Visit `http://localhost:3000`
3. Try creating a customer or item
4. Check Supabase dashboard → **Table Editor** to see if data is being saved

## Troubleshooting

### Error: "Invalid API key"
- Make sure `.env.local` has the correct values
- Restart your dev server after changing `.env.local`
- Check that `NEXT_PUBLIC_` prefix is present

### Error: "relation does not exist"
- Make sure you ran `001_create_tables.sql` first
- Check that tables were created in Supabase dashboard → **Table Editor**

### Error: "permission denied"
- Check RLS policies in Supabase dashboard
- For development, you can disable RLS (see Step 5)

### Data not persisting
- Check browser console for errors
- Check Supabase dashboard → **Logs** for server errors
- Verify environment variables are loaded correctly

## Next Steps

- ✅ Database is now configured
- ✅ All CRUD operations will persist to Supabase
- ✅ Data survives server restarts
- 🔄 Consider setting up authentication next
- 🔄 Set up proper RLS policies for production

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
