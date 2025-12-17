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
    TrendingUp,
    Wallet,
    Calendar,
    BookOpen,
    GraduationCap,
    DollarSign,
    Users,
    LogOut,
    Key,
    PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { usePermission } from '@/hooks/usePermission';

export default function Layout() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const { user } = useAuth();
    const { can, role } = usePermission();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Derived permissions
    const canViewInvoices = can('invoices.view');
    const canViewExpenses = can('expenses.view');
    const canViewPayroll = can('payroll.view');
    const canViewUsers = can('users.view');
    const canViewRoles = can('roles.view');
    // Settings usually require high-level management permissions.
    // We'll use a combination of specific management permissions or Admin role check as a proxy.
    const canViewSettings = role === 'Super Admin' || role === 'Admin' || can('roles.manage');


    return (
        <div className="flex h-screen bg-muted/40">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="flex h-20 items-center border-b px-4 lg:px-6">
                    <div className="flex items-center gap-2 font-semibold">
                        <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
                        <span className="">School Lekha</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                        <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4 text-blue-600" />} label="Dashboard" />

                        <div className="my-2 border-t border-border" />

                        {/* Reports Menu */}
                        <div className="space-y-1">
                            <button
                                onClick={() => setIsReportsOpen(!isReportsOpen)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-blue-600 w-full text-left font-medium hover:bg-blue-50"
                            >
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                <span className="flex-1">Reports</span>
                                {isReportsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>

                            {isReportsOpen && (
                                <div className="space-y-1 pl-4">
                                    <NavItem to="/reports/gl-head" icon={<PieChart className="h-4 w-4 text-indigo-500" />} label="GL Head Report" />
                                    <NavItem to="/reports/daybook" icon={<BookOpen className="h-4 w-4 text-gray-500" />} label="Day Book" />
                                    <NavItem to="/reports/defaulters" icon={<Users className="h-4 w-4 text-red-500" />} label="Defaulters" />
                                    <NavItem to="/reports/student-ledger" icon={<Receipt className="h-4 w-4 text-blue-500" />} label="Student Ledger" />
                                    <NavItem to="/reports/staff-ledger" icon={<Receipt className="h-4 w-4 text-cyan-500" />} label="Staff Ledger" />
                                    <NavItem to="/reports/profit-loss" icon={<TrendingDown className="h-4 w-4 text-green-500" />} label="Profit & Loss" />
                                    <NavItem to="/reports/cash-flow" icon={<Wallet className="h-4 w-4 text-orange-500" />} label="Cash Flow" />
                                    <NavItem to="/reports/salary-sheet" icon={<DollarSign className="h-4 w-4 text-purple-500" />} label="Salary Sheet" />
                                </div>
                            )}
                        </div>

                        <div className="my-2 border-t border-border" />

                        {canViewInvoices && (
                            <NavItem to="/invoices" icon={<Receipt className="h-4 w-4 text-green-600" />} label="Invoices" />
                        )}
                        {canViewPayroll && (
                            <NavItem to="/payroll" icon={<Wallet className="h-4 w-4 text-orange-600" />} label="Payroll" />
                        )}
                        {canViewExpenses && (
                            <NavItem to="/income" icon={<TrendingUp className="h-4 w-4 text-purple-600" />} label="Income" />
                        )}
                        {canViewExpenses && (
                            <NavItem to="/expenses" icon={<TrendingDown className="h-4 w-4 text-red-600" />} label="Expenses" />
                        )}

                        <div className="my-2 border-t border-border" />

                        {canViewUsers && (
                            <NavItem to="/users" icon={<Users className="h-4 w-4 text-cyan-600" />} label="Users" />
                        )}
                        {canViewRoles && (
                            <NavItem to="/roles" icon={<Key className="h-4 w-4 text-emerald-600" />} label="Roles" />
                        )}

                        <div className="my-2 border-t border-border" />

                        {/* Collapsible Settings Menu */}
                        {canViewSettings && (
                            <>
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
                                        <NavItem to="/settings" icon={<Calendar className="h-4 w-4 text-indigo-600" />} label="Fiscal Year" end />
                                        <NavItem to="/chart-of-accounts" icon={<BookOpen className="h-4 w-4 text-teal-600" />} label="Chart of Accounts" />
                                        <NavItem to="/fee-structures" icon={<GraduationCap className="h-4 w-4 text-pink-600" />} label="Fee Structures" />
                                        <NavItem to="/salary-structures" icon={<DollarSign className="h-4 w-4 text-amber-600" />} label="Salary Structures" />
                                        <NavItem to="/settings/staffs" icon={<Users className="h-4 w-4 text-cyan-600" />} label="Staffs" />
                                    </div>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                {/* User Profile Section */}
                <div className="border-t p-4">
                    <div
                        className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#FF5252] p-3 shadow-sm transition-colors hover:bg-[#FF5252]/90"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >

                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold text-white">Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}</p>
                            <p className="truncate text-xs text-white/90" title={user?.email}>
                                {user?.email}
                            </p>
                        </div>
                        {isUserMenuOpen ? <ChevronUp className="h-4 w-4 text-white/90" /> : <ChevronDown className="h-4 w-4 text-white/90" />}
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

function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
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
