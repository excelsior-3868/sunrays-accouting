import { createContext, useContext, useEffect, useState } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    permissions: string[];
    role: string | null;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    permissions: [],
    role: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchPermissions(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchPermissions(session.user.id);
            } else {
                setPermissions([]);
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchPermissions = async (userId: string) => {
        try {
            console.log('Fetching permissions for user:', userId);

            // Step 1: Get the user's role ID
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('Error fetching user role:', userError);
                setLoading(false);
                return;
            }

            if (!userData?.role) {
                console.log('No role assigned to user');
                setLoading(false);
                return;
            }

            const roleId = userData.role;

            // Step 2: Get role name
            const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .select('name')
                .eq('id', roleId)
                .single();

            if (roleError) {
                console.error('Error fetching role name:', roleError);
                setLoading(false);
                return;
            }

            setRole(roleData.name);
            console.log('Role loaded:', roleData.name);

            // Step 3: Get permissions directly from join table
            // This avoids potential 500 errors from deep nesting in the Roles query
            const { data: permData, error: permError } = await supabase
                .from('role_permissions')
                .select(`
                    permission:permissions (
                        slug
                    )
                `)
                .eq('role_id', roleId);

            if (permError) {
                console.error('Error fetching permissions:', permError);
                setLoading(false);
                return;
            }

            // Transform nested data to simple string array
            const perms = permData?.map((p: any) => p.permission?.slug).filter(Boolean) || [];
            console.log('Permissions loaded:', perms);
            setPermissions(perms);

        } catch (error) {
            console.error('Error in fetchPermissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        session,
        user,
        loading,
        permissions,
        role
    };

    useEffect(() => {
        if (!loading) {
            console.log('Auth Context Ready. Role:', role, 'Permissions:', permissions.length);
        }
    }, [loading, role, permissions]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
