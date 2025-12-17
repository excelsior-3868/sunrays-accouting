ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE expenses ALTER COLUMN payment_mode_gl_id DROP NOT NULL;
