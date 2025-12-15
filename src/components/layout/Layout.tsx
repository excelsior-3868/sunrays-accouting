import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    BarChart3,
    Receipt,
    TrendingDown,
    Wallet,
    Calendar,
    BookOpen,
    GraduationCap,
    DollarSign,
    Users,
    LogOut,
    Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function Layout() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const { user } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex h-screen bg-muted/40">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <div className="flex items-center gap-2 font-semibold">
                        <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                        <span className="">Sunrays Accounting</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                        <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4 text-blue-600" />} label="Dashboard" />

                        <div className="my-2 border-t border-border" />

                        <NavItem to="/reports" icon={<BarChart3 className="h-4 w-4 text-purple-600" />} label="Reports" />

                        <div className="my-2 border-t border-border" />
                        <NavItem to="/invoices" icon={<Receipt className="h-4 w-4 text-green-600" />} label="Invoices" />
                        <NavItem to="/expenses" icon={<TrendingDown className="h-4 w-4 text-red-600" />} label="Expenses" />
                        <NavItem to="/payroll" icon={<Wallet className="h-4 w-4 text-orange-600" />} label="Payroll" />

                        <div className="my-2 border-t border-border" />

                        <NavItem to="/users" icon={<Users className="h-4 w-4 text-cyan-600" />} label="Users" />

                        <div className="my-2 border-t border-border" />

                        {/* Collapsible Settings Menu */}
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-blue-600 w-full text-left font-medium hover:bg-blue-50"
                        >
                            <Settings className="h-4 w-4 text-gray-600" />
                            <span className="flex-1">Settings</span>
                            {isSettingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {isSettingsOpen && (
                            <div className="space-y-1 pl-4"> {/* Indented sub-menu */}
                                <NavItem to="/settings" icon={<Calendar className="h-4 w-4 text-indigo-600" />} label="Fiscal Years" />
                                <NavItem to="/chart-of-accounts" icon={<BookOpen className="h-4 w-4 text-teal-600" />} label="Chart of Accounts" />
                                <NavItem to="/fee-structures" icon={<GraduationCap className="h-4 w-4 text-pink-600" />} label="Fee Structures" />
                                <NavItem to="/salary-structures" icon={<DollarSign className="h-4 w-4 text-amber-600" />} label="Salary Structures" />
                                <NavItem to="/settings/staffs" icon={<Users className="h-4 w-4 text-cyan-600" />} label="Staffs" />
                            </div>
                        )}
                    </nav>
                </div>

                {/* User Profile Section */}
                <div className="border-t p-4">
                    <div
                        className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                            {user?.email?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold">Administrator</p>
                            <p className="truncate text-xs text-muted-foreground" title={user?.email}>
                                {user?.email}
                            </p>
                        </div>
                        {isUserMenuOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {isUserMenuOpen && (
                        <div className="mt-2 space-y-1 px-1">
                            <button
                                onClick={() => setIsChangePasswordOpen(true)}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-primary"
                            >
                                <Key className="h-4 w-4" />
                                Change Password
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-col sm:gap-4 sm:pl-64 w-full">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    {/* Mobile breadcrumb or header content could go here */}
                    <div className="w-full flex-1">
                        {/* Search or page title */}
                    </div>
                </header>
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    <Outlet />
                </main>
            </div>

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
        </div>
    );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                    isActive
                        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                        : "text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                )
            }
        >
            {icon}
            {label}
        </NavLink>
    );
}
