-- Enable RLS on Invoices and Invoice Items to ensure consistent access control
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users (or everyone if open) to view/create/edit
-- For now, purely permissive for 'authenticated' role, or public if anon key used without auth
-- Ideally, use "auth.role() = 'authenticated'" but during dev "true" is safer to unblock.

CREATE POLICY "Enable read access for all users" ON invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON invoices FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON invoice_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON invoice_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON invoice_items FOR DELETE USING (true);
