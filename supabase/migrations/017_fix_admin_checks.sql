-- Fix check_user_is_admin to support 'Super Admin' role name
-- The previous version only checked for 'Admin', causing RLS failures if the role was renamed to 'Super Admin'.

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
