-- Migration: Drop all items and invoices data
-- Created: 2026-01-04
-- Description: Deletes all data from items and invoices tables including related records

-- Disable foreign key constraints temporarily (if using RLS)
-- Note: In Supabase, RLS policies will still apply based on the authenticated user's role

-- Step 1: Delete all invoice-related items first (foreign key dependency)
DELETE FROM invoice_items 
WHERE invoice_id IN (SELECT id FROM invoices);

-- Step 2: Delete all e-waybills linked to invoices
DELETE FROM e_waybills 
WHERE invoice_id IN (SELECT id FROM invoices);

-- Step 3: Delete all payments linked to invoices
DELETE FROM payments 
WHERE invoice_id IN (SELECT id FROM invoices);

-- Step 4: Delete all invoices
DELETE FROM invoices;

-- Step 5: Delete all items
DELETE FROM items;

-- Verify the data has been deleted
-- SELECT COUNT(*) as items_count FROM items;
-- SELECT COUNT(*) as invoices_count FROM invoices;
-- SELECT COUNT(*) as invoice_items_count FROM invoice_items;
