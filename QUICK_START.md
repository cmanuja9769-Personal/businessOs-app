# Quick Start Guide - Supabase Configuration

## 🚀 Quick Setup (5 minutes)

### 1. Get Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project (or use existing)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Create `.env.local` File

Create a file named `.env.local` in the project root:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

**⚠️ Important:** Replace the placeholder values with your actual Supabase credentials!

### 3. Set Up Database Tables

1. Open Supabase Dashboard → **SQL Editor**
2. Run these scripts **in order**:

   **Script 1:** `scripts/001_create_tables.sql`
   - Creates all database tables
   - Click "Run" after pasting

   **Script 2:** `scripts/002_create_triggers.sql`
   - Sets up auto-update triggers
   - Click "Run" after pasting

   **Script 3:** `scripts/003_seed_dummy_data.sql` (Optional)
   - Adds sample data for testing
   - Click "Run" after pasting

### 4. Disable RLS (Development Only)

In SQL Editor, run:

\`\`\`sql
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
\`\`\`

### 5. Restart Dev Server

\`\`\`bash
npm run dev
\`\`\`

### 6. Verify It Works

1. Visit `http://localhost:3000`
2. Try creating a customer or item
3. Check Supabase Dashboard → **Table Editor** to see your data

## ✅ Done!

Your app is now connected to Supabase. All data will persist to the database.

## 📚 Need More Help?

- See `SUPABASE_SETUP.md` for detailed instructions
- See `scripts/README.md` for database script details

## 🔒 Production Setup

For production, you should:
1. Enable Row Level Security (RLS)
2. Create proper RLS policies
3. Set up authentication
4. Use environment-specific credentials

See `SUPABASE_SETUP.md` for production configuration.
