import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);

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
                <div className="flex-1 overflow-y-auto">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1 mt-4">
                        <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />

                        <div className="my-2 border-t border-border" />

                        <NavItem to="/reports" icon={<FileText className="h-4 w-4" />} label="Reports" />

                        <div className="my-2 border-t border-border" />
                        <NavItem to="/invoices" icon={<FileText className="h-4 w-4" />} label="Invoices" />
                        <NavItem to="/expenses" icon={<FileText className="h-4 w-4" />} label="Expenses" />
                        <NavItem to="/payroll" icon={<FileText className="h-4 w-4" />} label="Payroll" />

                        <div className="my-2 border-t border-border" />

                        {/* Collapsible Settings Menu */}
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary w-full text-left font-medium hover:bg-muted"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="flex-1">Settings</span>
                            {isSettingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {isSettingsOpen && (
                            <div className="space-y-1 pl-4"> {/* Indented sub-menu */}
                                <NavItem to="/settings" icon={<FileText className="h-4 w-4" />} label="Fiscal Years" />
                                <NavItem to="/chart-of-accounts" icon={<FileText className="h-4 w-4" />} label="Chart of Accounts" />
                                <NavItem to="/fee-structures" icon={<FileText className="h-4 w-4" />} label="Fee Structures" />
                                <NavItem to="/salary-structures" icon={<FileText className="h-4 w-4" />} label="Salary Structures" />
                                <NavItem to="/settings/staffs" icon={<FileText className="h-4 w-4" />} label="Staffs" />
                            </div>
                        )}
                    </nav>
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
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        : "text-muted-foreground hover:bg-muted hover:text-primary"
                )
            }
        >
            {icon}
            {label}
        </NavLink>
    );
}
