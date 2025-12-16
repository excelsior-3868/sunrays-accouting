-- Seed permissions for Expenses Module

INSERT INTO public.permissions (slug, description) VALUES
    ('expenses.view', 'View expenses list'),
    ('expenses.manage', 'Create, edit, and delete expenses')
ON CONFLICT (slug) DO NOTHING;

-- Assign permissions to Admin and Super Admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'Super Admin')
  AND p.slug IN ('expenses.view', 'expenses.manage')
ON CONFLICT DO NOTHING;
