import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    requiredPermission?: string;
    redirectPath?: string;
    children?: React.ReactNode;
}

export default function ProtectedRoute({
    requiredPermission,
    redirectPath = '/',
    children
}: ProtectedRouteProps) {
    const { can, loading } = usePermission();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (requiredPermission && !can(requiredPermission)) {
        return <Navigate to={redirectPath} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
