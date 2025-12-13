-- Add student_name to invoices for display purposes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Index for searching invoices by student name
CREATE INDEX IF NOT EXISTS idx_invoices_student_name ON invoices(student_name);
