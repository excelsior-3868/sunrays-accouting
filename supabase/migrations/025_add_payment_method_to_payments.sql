ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ALTER COLUMN payment_mode_gl_id DROP NOT NULL;
