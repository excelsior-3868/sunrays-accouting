-- Fix recursive RLS policies
-- The previous policy "Allow admin manage roles" caused infinite recursion because it queried the roles table itself.

-- 1. Create a secure function to check admin status
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- We query users and roles tables. Because this is SECURITY DEFINER, 
  -- it uses the privileges of the function creator (postgres), bypassing RLS on roles/users.
  SELECT (r.name = 'Admin') INTO is_admin
  FROM public.users u
  JOIN public.roles r ON u.role = r.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic generic policy
DROP POLICY IF EXISTS "Allow admin manage roles" ON public.roles;
DROP POLICY IF EXISTS "Allow admin manage role_permissions" ON public.role_permissions;

-- 3. Create specific policies for mutations using the helper function
-- RLS for Roles
CREATE POLICY "Allow admin insert roles" ON public.roles FOR INSERT WITH CHECK (public.check_user_is_admin());
CREATE POLICY "Allow admin update roles" ON public.roles FOR UPDATE USING (public.check_user_is_admin());
CREATE POLICY "Allow admin delete roles" ON public.roles FOR DELETE USING (public.check_user_is_admin());

-- RLS for Role Permissions
CREATE POLICY "Allow admin insert role_permissions" ON public.role_permissions FOR INSERT WITH CHECK (public.check_user_is_admin());
CREATE POLICY "Allow admin delete role_permissions" ON public.role_permissions FOR DELETE USING (public.check_user_is_admin());
-- Role permissions usually don't need update, just delete/insert. But if needed:
-- CREATE POLICY "Allow admin update role_permissions" ON public.role_permissions FOR UPDATE USING (public.check_user_is_admin());

-- 4. Ensure Read access is still there (it was separate, but good to verify)
-- "Allow public read roles" exists.
-- "Allow public read permissions" exists.
-- "Allow public read role_permissions" exists.

-- 5. Grant execute permission on the function (optional depending on setup, but good practice)
GRANT EXECUTE ON FUNCTION public.check_user_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin TO service_role;
