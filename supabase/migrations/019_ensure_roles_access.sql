-- MASTER FIX for Roles Access
-- This script ensures that:
-- 1. The recursive policy is gone.
-- 2. The Read policy exists and is correct.
-- 3. The Admin Check function supports 'Super Admin'.

-- A. Fix the Admin Check Function (Support Super Admin)
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user's role is either 'Admin' or 'Super Admin'
  SELECT (r.name IN ('Admin', 'Super Admin')) INTO is_admin
  FROM public.users u
  JOIN public.roles r ON u.role = r.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Drop potentially problematic policies
DROP POLICY IF EXISTS "Allow admin manage roles" ON public.roles;
DROP POLICY IF EXISTS "Let admin manage roles" ON public.roles; 
DROP POLICY IF EXISTS "Allow public read roles" ON public.roles; -- We will recreate it to be sure

-- C. Re-create the Read Policy (Valid for ALL authenticated users)
CREATE POLICY "Allow public read roles" ON public.roles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- D. Re-create the Write Policies (Using the fixed function)
-- We use unique names to avoid conflicts if they already exist
DROP POLICY IF EXISTS "Allow admin insert roles" ON public.roles;
DROP POLICY IF EXISTS "Allow admin update roles" ON public.roles;
DROP POLICY IF EXISTS "Allow admin delete roles" ON public.roles;

CREATE POLICY "Allow admin insert roles" ON public.roles FOR INSERT WITH CHECK (public.check_user_is_admin());
CREATE POLICY "Allow admin update roles" ON public.roles FOR UPDATE USING (public.check_user_is_admin());
CREATE POLICY "Allow admin delete roles" ON public.roles FOR DELETE USING (public.check_user_is_admin());

-- E. Ensure RLS is enabled
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
