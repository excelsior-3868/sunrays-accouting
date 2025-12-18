import { useEffect, useState } from 'react';
import { Loader2, DollarSign, CreditCard, TrendingUp, TrendingDown, Receipt, Calendar, CalendarDays, Users, UserCog, GraduationCap, Shield } from 'lucide-react';
import { getInvoices, getPayments, getExpenses, getStudents, getTeachers, getStaffMembers, getUsers } from '@/lib/api';
import { toNepali, formatNepaliDate, getNepaliFiscalYear } from '@/lib/nepaliDate';

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
                // @ts-ignore
                const totalFeeCollection = payData.filter(p => p.invoice_id).reduce((sum, p) => sum + p.amount, 0);
                // @ts-ignore
                const totalIncome = payData.reduce((sum, p) => sum + p.amount, 0);

                const totalExpenses = expData.reduce((sum, e) => sum + e.amount, 0);

                // Outstanding = Invoiced - Fee Collection (not total income)
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
                    .slice(0, 5);

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

                // Count support staff (staff with category 'Support Staff')
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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">{nepaliDate}</p>
                        <p className="text-xs font-medium text-muted-foreground">FY {fiscalYear}</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    title="Total Assessed Fees"
                    value={stats.totalInvoiced}
                    icon={<Receipt className="h-6 w-6" />}
                    gradient="from-[#5B7FED] to-[#4A6BD9]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Fee Collection"
                    value={stats.totalFeeCollection}
                    icon={<DollarSign className="h-6 w-6" />}
                    gradient="from-[#10B981] to-[#059669]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Income"
                    value={stats.totalIncome}
                    icon={<TrendingUp className="h-6 w-6" />}
                    gradient="from-[#8B5CF6] to-[#7C3AED]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Expenses"
                    value={stats.totalExpenses}
                    icon={<TrendingDown className="h-6 w-6" />}
                    gradient="from-[#FF5757] to-[#E63946]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Outstanding Dues"
                    value={stats.outstanding}
                    icon={<CreditCard className="h-6 w-6" />}
                    gradient="from-[#F4C542] to-[#E5B534]"
                    iconBg="bg-white/20"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-col space-y-1.5">
                        <h3 className="font-semibold leading-none tracking-tight">Recent Transactions</h3>
                        <p className="text-sm text-muted-foreground">Latest income and expenses.</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="space-y-4">
                            {stats.recentTxns.map((txn, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${txn.type === 'Income' ? 'bg-green-100' : 'bg-red-100'}`}>
                                            {txn.type === 'Income' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{txn.description}</p>
                                            <p className="text-xs text-muted-foreground">{txn.date}</p>
                                        </div>
                                    </div>
                                    <div className={`font-medium ${txn.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.type === 'Income' ? '+' : '-'} NPR {txn.amount}
                                    </div>
                                </div>
                            ))}
                            {stats.recentTxns.length === 0 && <div className="text-muted-foreground text-sm">No recent activity.</div>}
                        </div>
                    </div>
                </div>


                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-col space-y-1.5">
                        <h3 className="font-semibold leading-none tracking-tight">Quick Stats</h3>
                        <p className="text-sm text-muted-foreground">Overview of key metrics</p>
                    </div>
                    <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                        <InfoCard
                            title="Today"
                            value={stats.transactionsToday}
                            icon={<Calendar className="h-5 w-5" />}
                            color="text-blue-600"
                            bgColor="bg-blue-50"
                            suffix="Transactions"
                        />
                        <InfoCard
                            title="This Month"
                            value={stats.transactionsThisMonth}
                            icon={<CalendarDays className="h-5 w-5" />}
                            color="text-purple-600"
                            bgColor="bg-purple-50"
                            suffix="Transactions"
                        />
                        <InfoCard
                            title="Students"
                            value={stats.totalStudents}
                            icon={<Users className="h-5 w-5" />}
                            color="text-green-600"
                            bgColor="bg-green-50"
                        />
                        <InfoCard
                            title="Teachers"
                            value={stats.totalTeachers}
                            icon={<GraduationCap className="h-5 w-5" />}
                            color="text-indigo-600"
                            bgColor="bg-indigo-50"
                        />
                        <InfoCard
                            title="Support Staff"
                            value={stats.totalSupportStaff}
                            icon={<UserCog className="h-5 w-5" />}
                            color="text-orange-600"
                            bgColor="bg-orange-50"
                        />
                        <InfoCard
                            title="System Users"
                            value={stats.totalUsers}
                            icon={<Shield className="h-5 w-5" />}
                            color="text-teal-600"
                            bgColor="bg-teal-50"
                        />
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
        <div className={`relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br ${gradient} text-white transition-all duration-300 hover:shadow-xl hover:scale-105`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
                        {icon}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white/90">{title}</p>
                    <p className="text-3xl font-bold">NPR {value.toLocaleString()}</p>
                </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10"></div>
        </div>
    );
}

function InfoCard({
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
        <div className={`rounded-lg border ${bgColor} p-4 transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-start gap-3">
                <div className={`${color} mt-1`}>
                    {icon}
                </div>
                <div className="flex-1">
                    {suffix ? (
                        // Layout for transaction cards: suffix on top, title below, then count
                        <>
                            <p className={`text-sm font-semibold ${color}`}>{suffix}</p>
                            <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        </>
                    ) : (
                        // Layout for other cards: title on top, number below
                        <>
                            <p className="text-xs text-muted-foreground font-medium">{title}</p>
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
