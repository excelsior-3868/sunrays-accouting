-- Migration: 005_add_class_to_fee_structures.sql
-- Description: Adds 'class_name' column to fee_structures table to allow batch invoice generation by class.

ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_name TEXT;

-- Optional: You can run an update manually to set class names for existing structures if needed
-- UPDATE fee_structures SET class_name = 'Nursery' WHERE name ILIKE '%Nursery%';
