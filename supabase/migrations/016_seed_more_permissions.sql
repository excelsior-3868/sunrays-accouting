-- Seed additional permissions for Settings & Modules
-- Resources: Fiscal Years, Chart of Accounts, Fee Structures, Salary Structures, Staff

INSERT INTO public.permissions (slug, description) VALUES
    ('fiscal_years.view', 'View fiscal years configuration'),
    ('fiscal_years.manage', 'Create, edit, and delete fiscal years'),
    
    ('coa.view', 'View chart of accounts'),
    ('coa.manage', 'Create, edit, and delete accounts'),
    
    ('fee_structures.view', 'View fee structures'),
    ('fee_structures.manage', 'Create, edit, and delete fee structures'),
    
    ('salary_structures.view', 'View salary structures'),
    ('salary_structures.manage', 'Create, edit, and delete salary structures'),
    
    ('staff.view', 'View staff directory'),
    ('staff.manage', 'Create, edit, and delete staff records')
ON CONFLICT (slug) DO NOTHING;

-- Assign ALL new permissions to 'Admin' role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.slug IN (
    'fiscal_years.view', 'fiscal_years.manage',
    'coa.view', 'coa.manage',
    'fee_structures.view', 'fee_structures.manage',
    'salary_structures.view', 'salary_structures.manage',
    'staff.view', 'staff.manage'
  )
ON CONFLICT DO NOTHING;
