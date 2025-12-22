import { useEffect, useState } from 'react';
import { Loader2, DollarSign, CreditCard, TrendingUp, TrendingDown, Receipt, Calendar, CalendarDays, Users, UserCog, GraduationCap, Shield, ArrowRight } from 'lucide-react';
import { getInvoices, getPayments, getExpenses, getStudents, getTeachers, getStaffMembers, getUsers } from '@/lib/api';
import { toNepali, formatNepaliDate, getNepaliFiscalYear } from '@/lib/nepaliDate';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalInvoiced: 0,
        totalFeeCollection: 0,
        totalIncome: 0,
        totalExpenses: 0,
        outstanding: 0,
        recentTxns: [] as any[],
        transactionsToday: 0,
        transactionsThisMonth: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSupportStaff: 0,
        totalUsers: 0
    });

    const todayDate = new Date();
    const nepaliDate = formatNepaliDate(toNepali(todayDate));
    const fiscalYear = getNepaliFiscalYear(todayDate);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invData, payData, expData, studentsData, teachersData, staffData, usersCount] = await Promise.all([
                    getInvoices(),
                    getPayments(),
                    getExpenses(),
                    getStudents().catch(() => []),
                    getTeachers().catch(() => []),
                    getStaffMembers().catch(() => []),
                    getUsers().catch(() => 0)
                ]);

                // Calculate Totals
                const totalInvoiced = invData.reduce((sum, i) => sum + i.total_amount, 0);

                // Separate Fee Collection from Direct Income
                const totalFeeCollection = payData.filter(p => p.invoice_id).reduce((sum, p) => sum + p.amount, 0);
                const totalIncome = payData.reduce((sum, p) => sum + p.amount, 0);
                const totalExpenses = expData.reduce((sum, e) => sum + e.amount, 0);

                // Outstanding = Invoiced - Fee Collection
                const outstanding = totalInvoiced - totalFeeCollection;

                // Recent Transactions
                const payments = payData.map(p => {
                    // @ts-ignore
                    const description = p.invoice_id
                        // @ts-ignore
                        ? `Fee Receipt - ${p.invoice?.student_name}`
                        // @ts-ignore
                        : `Income - ${p.income_head?.name || 'Miscellaneous'}`;

                    return {
                        id: p.id,
                        date: p.payment_date,
                        description,
                        amount: p.amount,
                        type: 'Income'
                    };
                });

                const expenses = expData.map(e => ({
                    id: e.id,
                    date: e.expense_date,
                    description: `${e.expense_head?.name} - ${e.description || ''}`,
                    amount: e.amount,
                    type: 'Expense'
                }));

                const allTxns = [...payments, ...expenses]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10); // Show more on dash

                // Calculate transactions per day and month
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                const transactionsToday = [...payments, ...expenses].filter(txn => {
                    const txnDate = new Date(txn.date);
                    return txnDate >= startOfToday;
                }).length;

                const transactionsThisMonth = [...payments, ...expenses].filter(txn => {
                    const txnDate = new Date(txn.date);
                    return txnDate >= startOfMonth;
                }).length;

                // Count support staff
                const supportStaffCount = staffData.filter(s =>
                    s.category?.toLowerCase().includes('support')
                ).length;

                setStats({
                    totalInvoiced,
                    totalFeeCollection,
                    totalIncome,
                    totalExpenses,
                    outstanding,
                    recentTxns: allTxns,
                    transactionsToday,
                    transactionsThisMonth,
                    totalStudents: studentsData.length,
                    totalTeachers: teachersData.length,
                    totalSupportStaff: supportStaffCount,
                    totalUsers: usersCount || 0
                });

            } catch (error) {
                console.error('Error dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight text-blue-600"> Dashboard</h1>

                </div>
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2 shadow-sm shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-blue-700">{nepaliDate}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fiscal Year {fiscalYear}</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                    title="Fees Assessed"
                    value={stats.totalInvoiced}
                    icon={<Receipt className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-blue-600 to-blue-800"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Fee Collection"
                    value={stats.totalFeeCollection}
                    icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-emerald-500 to-emerald-700"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Income"
                    value={stats.totalIncome}
                    icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-indigo-500 to-indigo-700"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Expenses"
                    value={stats.totalExpenses}
                    icon={<TrendingDown className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-rose-500 to-rose-700"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Outstanding"
                    value={stats.outstanding}
                    icon={<CreditCard className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-amber-500 to-amber-700"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Balance"
                    value={stats.totalIncome - stats.totalExpenses}
                    icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
                    gradient="from-sky-600 to-sky-800"
                    iconBg="bg-white/20"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                {/* Recent Activity */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3" /> Recent Transactions
                        </h3>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="divide-y">
                            {stats.recentTxns.map((txn, i) => (
                                <div key={i} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                                            txn.type === 'Income' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
                                        )}>
                                            {txn.type === 'Income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">{txn.description}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{toNepali(txn.date)}</p>
                                                <span className="text-[10px] text-muted-foreground opacity-50">•</span>
                                                <p className="text-[10px] text-muted-foreground">{txn.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "font-black text-right pl-4",
                                        txn.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {txn.type === 'Income' ? '+' : '-'} {txn.amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {stats.recentTxns.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground bg-slate-50/50 italic text-sm">No recent activity detected.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="lg:col-span-3 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                        <TrendingDown className="h-3 w-3" /> Quick Analytics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <SmallInfoCard
                                title="Today"
                                value={stats.transactionsToday}
                                icon={<Calendar className="h-4 w-4" />}
                                color="text-blue-600"
                                bgColor="bg-blue-50/50"
                                suffix="Txns"
                            />
                            <SmallInfoCard
                                title="This Month"
                                value={stats.transactionsThisMonth}
                                icon={<CalendarDays className="h-4 w-4" />}
                                color="text-purple-600"
                                bgColor="bg-purple-50/50"
                                suffix="Txns"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <SmallInfoCard
                                title="Students"
                                value={stats.totalStudents}
                                icon={<Users className="h-4 w-4" />}
                                color="text-emerald-600"
                                bgColor="bg-emerald-50/50"
                            />
                            <SmallInfoCard
                                title="Teachers"
                                value={stats.totalTeachers}
                                icon={<GraduationCap className="h-4 w-4" />}
                                color="text-indigo-600"
                                bgColor="bg-indigo-50/50"
                            />
                            <SmallInfoCard
                                title="Staff"
                                value={stats.totalSupportStaff}
                                icon={<UserCog className="h-4 w-4" />}
                                color="text-orange-600"
                                bgColor="bg-orange-50/50"
                            />
                            <SmallInfoCard
                                title="Users"
                                value={stats.totalUsers}
                                icon={<Shield className="h-4 w-4" />}
                                color="text-slate-600"
                                bgColor="bg-slate-50/50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    gradient,
    iconBg
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
}) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
            gradient
        )}>
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className={cn("flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl", iconBg)}>
                        {icon}
                    </div>
                </div>
                <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[9px] md:text-[10px] font-bold text-white/80 uppercase tracking-widest">{title}</p>
                    <p className="text-lg md:text-2xl font-black whitespace-nowrap">NPR {value.toLocaleString()}</p>
                </div>
            </div>
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10"></div>
        </div>
    );
}

function SmallInfoCard({
    title,
    value,
    icon,
    color,
    bgColor,
    suffix
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    suffix?: string;
}) {
    return (
        <div className={cn("rounded-xl border p-3 flex items-center gap-3 transition-all duration-200 hover:shadow-sm", bgColor)}>
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", bgColor.replace('/50', ''), color)}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">{title}</p>
                <div className="flex items-baseline gap-1">
                    <p className={cn("text-lg font-black leading-none", color)}>{value.toLocaleString()}</p>
                    {suffix && <span className={cn("text-[9px] font-bold", color)}>{suffix}</span>}
                </div>
            </div>
        </div>
    );
}
