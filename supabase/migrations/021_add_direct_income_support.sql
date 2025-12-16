-- Make invoice_id nullable to allow direct income (not linked to invoice)
ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

-- Add income_head_id to link direct income to a specific GL Head
ALTER TABLE payments ADD COLUMN income_head_id UUID REFERENCES gl_heads(id);

-- Add comment
COMMENT ON COLUMN payments.invoice_id IS 'Link to student invoice. Null for direct income.';
COMMENT ON COLUMN payments.income_head_id IS 'GL Head for direct income (e.g. Donations, Rent). Null for fee payments.';
