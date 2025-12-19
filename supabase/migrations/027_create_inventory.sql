-- Create Inventory Items Table with hierarchy (Tree Structure)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Permissive Policies
CREATE POLICY "Enable all access for authenticated users" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_parent ON inventory_items(parent_id);

-- Seed Initial Categories
-- 1. IT and Computer Equipment
-- 2. Furniture and Fixtures
-- 3. Kitchen/Canteen Supplies
-- 4. Teaching and Learning Materials
-- 5. Sports and Physical Education

DO $$
DECLARE
    root_exists BOOLEAN;
BEGIN
    -- Check if any data exists to prevent double seeding on re-runs
    SELECT EXISTS (SELECT 1 FROM inventory_items) INTO root_exists;
    
    IF NOT root_exists THEN
        INSERT INTO inventory_items (name, parent_id) VALUES
        ('IT and Computer Equipment', NULL),
        ('Furniture and Fixtures', NULL),
        ('Kitchen/Canteen Supplies', NULL),
        ('Teaching and Learning Materials', NULL),
        ('Sports and Physical Education', NULL);
    END IF;
END $$;
