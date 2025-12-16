import { useAuth } from '@/contexts/AuthContext';

export const usePermission = () => {
    const { permissions, role, loading } = useAuth();

    const can = (permissionSlug: string) => {
        if (!permissions) return false;
        // Super Admin or Admin usually has all access, but let's rely on explicit permissions + explicit '*' permission if we had one.
        // For now, if role is 'Super Admin' or 'Admin' maybe we bypass?
        // The plan said "Admin gets ALL permissions" via seeding. So we can just check the array.
        // However, for safety, if we want hardcoded override:
        if (role === 'Super Admin') return true;

        return permissions.includes(permissionSlug);
    };

    return { can, role, permissions, loading };
};
