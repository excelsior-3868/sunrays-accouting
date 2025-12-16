-- 1. Create Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE, -- e.g., 'invoices.view'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Role Permissions Join Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Seed Permissions
INSERT INTO public.permissions (slug, description) VALUES
    ('invoices.view', 'View invoices'),
    ('invoices.create', 'Create new invoices'),
    ('invoices.edit', 'Edit existing invoices'),
    ('invoices.delete', 'Delete invoices'),
    ('payroll.view', 'View payroll'),
    ('payroll.manage', 'Process and manage payroll'),
    ('users.view', 'View users list'),
    ('users.manage', 'Create, edit, and delete users'),
    ('roles.view', 'View roles'),
    ('roles.manage', 'Manage roles and permissions')
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed Roles (Admin, User, View Only)
INSERT INTO public.roles (name, description) VALUES
    ('Admin', 'Full access to all features'),
    ('User', 'Standard user access'),
    ('ViewOnly', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- 6. Assign Permissions to Roles
-- Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- User gets specific permissions (Example: View & Create Invoices, View Payroll)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug IN ('invoices.view', 'invoices.create', 'payroll.view')
WHERE r.name = 'User'
ON CONFLICT DO NOTHING;

-- ViewOnly gets only View permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug LIKE '%.view'
WHERE r.name = 'ViewOnly'
ON CONFLICT DO NOTHING;


-- 7. Migrate Users Table
-- Add temporary column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- Map existing string roles to new Role IDs
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'Admin') 
WHERE role = 'admin' OR role IS NULL; -- Defaulting NULL to Admin safe-guard or 'User' depending on preference. Let's assume Admin for safety of access for the main user, or User. Let's use 'Admin' for those labeled 'admin'.

UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'User') 
WHERE role = 'user';

UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'ViewOnly') 
WHERE role = 'view_only';

-- Handle cases where role might not match (fallback to User)
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'User') 
WHERE role_id IS NULL;

-- Drop old column and rename new one
ALTER TABLE public.users DROP COLUMN role;
ALTER TABLE public.users RENAME COLUMN role_id TO role;

-- 8. Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users for roles/permissions (needed for UI)
CREATE POLICY "Allow public read roles" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read permissions" ON public.permissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read role_permissions" ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');

-- Allow Admin only to mutate roles/permissions
-- We need a way to check if the *current user* has the 'roles.manage' permission.
-- This gets complex in RLS without a helper function. 
-- For now, let's allow all authenticated users to read, and we will restrict MUTATION via application logic or a stricter RLS later.
-- Ideally, we create a function `check_permission(slug)` and use it in policies.

-- Simple Policy for Management (Example: only allow if user's role is 'Admin')
-- Note: queries user's own role.
CREATE POLICY "Allow admin manage roles" ON public.roles 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN (SELECT id FROM public.roles WHERE name = 'Admin')
        )
    );

CREATE POLICY "Allow admin manage role_permissions" ON public.role_permissions 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN (SELECT id FROM public.roles WHERE name = 'Admin')
        )
    );

-- 9. Update User Creation Trigger for UUID Roles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get default role (User)
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'User';
  
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::UUID, default_role_id)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
