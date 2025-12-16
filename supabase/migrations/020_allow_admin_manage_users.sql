-- Allow Admins to update and delete users
-- Relies on check_user_is_admin() existing from 019_ensure_roles_access.sql

-- 1. Policy for Updating Users
-- Allows Admins and Super Admins to update any user profile
CREATE POLICY "Allow admin update users" ON public.users
    FOR UPDATE
    USING (public.check_user_is_admin());

-- 2. Policy for Deleting Users
-- Allows Admins and Super Admins to delete users
CREATE POLICY "Allow admin delete users" ON public.users
    FOR DELETE
    USING (public.check_user_is_admin());

-- 3. Policy for Inserting Users
-- Useful if admins create users directly in public.users (though usually handled by auth trigger)
CREATE POLICY "Allow admin insert users" ON public.users
    FOR INSERT
    WITH CHECK (public.check_user_is_admin());
