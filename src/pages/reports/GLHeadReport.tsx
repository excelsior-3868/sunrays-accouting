import { useState, useEffect, useMemo } from 'react';
import { Loader2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { getPayments, getExpenses, getGLHeads } from '@/lib/api';
import { type GLHead } from '@/types';
import NepaliDate from 'nepali-date-converter';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import SearchableSelect from '@/components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ReportMode = 'date' | 'month';

type GLTotal = {
    id: string;
    name: string;
    code?: string;
    type: string;
    amount: number;
    percentage: number;
};

const NEPAL_MONTHS_BS = [
    "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
];

export default function GLHeadReport() {
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<ReportMode>('month');
    const [activeView, setActiveView] = useState<'chart' | 'table'>('table');
    const [selectedGLHeadId, setSelectedGLHeadId] = useState<string>('');

    // Data
    const [transactions, setTransactions] = useState<any[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);

    // Filters
    // Month Mode
    const currentBsDate = new NepaliDate();
    const [selectedYear, setSelectedYear] = useState<number>(currentBsDate.getYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(currentBsDate.getMonth()); // 0-11

    // Date Mode
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [payData, expData, headData] = await Promise.all([
                    getPayments(),
                    getExpenses(),
                    getGLHeads()
                ]);

                // Normalize transactions
                const incomes = payData.flatMap((p: any) => {
                    if (!p.invoice_id) {
                        return [{
                            amount: p.amount,
                            gl_head_id: p.income_head_id,
                            date: p.payment_date,
                            type: 'Income'
                        }];
                    }

                    const invoice = p.invoice;
                    if (invoice && invoice.items && invoice.items.length > 0) {
                        const totalInv = invoice.total_amount || 1;
                        const ratio = p.amount / totalInv;

                        return invoice.items.map((item: any) => ({
                            amount: item.amount * ratio,
                            gl_head_id: item.gl_head_id,
                            date: p.payment_date,
                            type: 'Income'
                        }));
                    }

                    return [{
                        amount: p.amount,
                        gl_head_id: p.payment_mode_gl_id,
                        date: p.payment_date,
                        type: 'Income'
                    }];
                });

                const expenses = expData.map(e => ({
                    amount: e.amount,
                    gl_head_id: e.expense_head_id,
                    date: e.expense_date,
                    type: 'Expense'
                }));

                setTransactions([...incomes, ...expenses]);
                setGlHeads(headData);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const dateRange = useMemo(() => {
        if (mode === 'date') {
            return {
                start: startDate ? new Date(startDate) : new Date('1970-01-01'),
                end: endDate ? new Date(endDate) : new Date('2100-01-01')
            };
        } else {
            const startBs = new NepaliDate(selectedYear, selectedMonth, 1);
            const startAd = startBs.toJsDate();

            let nextMonth = selectedMonth + 1;
            let nextYear = selectedYear;
            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear++;
            }
            const nextMonthBs = new NepaliDate(nextYear, nextMonth, 1);
            const endAd = new Date(nextMonthBs.toJsDate());
            endAd.setDate(endAd.getDate() - 1);

            return { start: startAd, end: endAd };
        }
    }, [mode, startDate, endDate, selectedYear, selectedMonth]);

    const { incomeItems, expenseItems, totalIncome, totalExpense } = useMemo(() => {
        const { start, end } = dateRange;
        const filtered = transactions.filter((t: any) => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const grouped = new Map<string, number>();
        filtered.forEach((t: any) => {
            if (!t.gl_head_id) return;
            const current = grouped.get(t.gl_head_id) || 0;
            grouped.set(t.gl_head_id, current + t.amount);
        });

        const income: GLTotal[] = [];
        const expense: GLTotal[] = [];
        let tInc = 0;
        let tExp = 0;

        glHeads.forEach(head => {
            const amount = grouped.get(head.id) || 0;
            if (amount === 0) return;

            const item: GLTotal = {
                id: head.id,
                name: head.name,
                code: head.code,
                type: head.type,
                amount: amount,
                percentage: 0
            };

            if (head.type === 'Income') {
                income.push(item);
                tInc += amount;
            } else if (head.type === 'Expense') {
                expense.push(item);
                tExp += amount;
            }
        });

        income.forEach(item => item.percentage = tInc > 0 ? (item.amount / tInc) * 100 : 0);
        expense.forEach(item => item.percentage = tExp > 0 ? (item.amount / tExp) * 100 : 0);

        return {
            incomeItems: income.sort((a, b) => b.amount - a.amount),
            expenseItems: expense.sort((a, b) => b.amount - a.amount),
            totalIncome: tInc,
            totalExpense: tExp
        };
    }, [transactions, dateRange, glHeads]);

    const monthlyData = useMemo(() => {
        if (!selectedGLHeadId) return [];

        let glTransactions: any[] = [];
        if (selectedGLHeadId === 'ALL_INCOME') {
            glTransactions = transactions.filter(t => t.type === 'Income');
        } else if (selectedGLHeadId === 'ALL_EXPENSE') {
            glTransactions = transactions.filter(t => t.type === 'Expense');
        } else {
            glTransactions = transactions.filter(t => t.gl_head_id === selectedGLHeadId);
        }

        return NEPAL_MONTHS_BS.map((monthName, index) => {
            const startBs = new NepaliDate(selectedYear, index, 1);
            const startAd = startBs.toJsDate();

            let nextMonth = index + 1;
            let nextYear = selectedYear;
            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear++;
            }
            const nextMonthBs = new NepaliDate(nextYear, nextMonth, 1);
            const endAd = new Date(nextMonthBs.toJsDate());
            endAd.setDate(endAd.getDate() - 1);
            endAd.setHours(23, 59, 59, 999);

            const total = glTransactions.reduce((sum, t) => {
                const d = new Date(t.date);
                if (d >= startAd && d <= endAd) {
                    return sum + t.amount;
                }
                return sum;
            }, 0);

            return { month: monthName, amount: total };
        });
    }, [transactions, selectedYear, selectedGLHeadId]);

    const maxMonthlyAmount = Math.max(...monthlyData.map(d => d.amount), 0);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    const years = [currentBsDate.getYear() - 1, currentBsDate.getYear(), currentBsDate.getYear() + 1];

    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">GL Head Report</h1>


            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <Button
                    variant="ghost"
                    onClick={() => setActiveView('chart')}
                    className={cn(
                        "rounded-none border-b-2 bg-transparent px-4 py-2 font-medium hover:bg-transparent transition-all",
                        activeView === 'chart' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    Chart View
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveView('table')}
                    className={cn(
                        "rounded-none border-b-2 bg-transparent px-4 py-2 font-medium hover:bg-transparent transition-all",
                        activeView === 'table' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    Table Data
                </Button>
            </div>

            {/* Content */}
            {activeView === 'chart' ? (
                <div className="space-y-2">
                    {/* GL Selection for Chart */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Select GL Head for Monthly Analysis</label>
                                <SearchableSelect
                                    options={[
                                        ...glHeads.map(h => ({ value: h.id, label: h.code ? `${h.name} (${h.code})` : h.name, group: h.type })),
                                        { value: 'ALL_INCOME', label: 'All Incomes (Summary)', group: 'Income' },
                                        { value: 'ALL_EXPENSE', label: 'All Expenses (Summary)', group: 'Expense' }
                                    ].sort((a, b) => {
                                        // Custom sort to put "All" options at the top of their groups
                                        if (a.value === 'ALL_INCOME') return -1;
                                        if (b.value === 'ALL_INCOME') return 1;
                                        if (a.value === 'ALL_EXPENSE') return -1;
                                        if (b.value === 'ALL_EXPENSE') return 1;
                                        return a.label.localeCompare(b.label);
                                    })}
                                    value={selectedGLHeadId}
                                    onChange={(val) => setSelectedGLHeadId(val)}
                                    placeholder="Search GL Head..."
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg text-sm">
                                <span className="text-muted-foreground whitespace-nowrap font-bold">Year:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-transparent font-bold focus:outline-none cursor-pointer"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bar Graph */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">
                                    Month Wise Amount - {
                                        selectedGLHeadId === 'ALL_INCOME' ? 'Total Income Summary' :
                                            selectedGLHeadId === 'ALL_EXPENSE' ? 'Total Expense Summary' :
                                                (glHeads.find(h => h.id === selectedGLHeadId)?.name || 'Select a GL Head')
                                    }
                                </h3>
                            </div>
                            {selectedGLHeadId && (
                                <div className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                                    Total: {monthlyData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                                </div>
                            )}
                        </div>

                        {!selectedGLHeadId ? (
                            <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                                <p>Please select a GL Head to view the monthly report</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto pb-4 -mx-2 px-2">
                                <div className="relative h-[400px] mt-4 flex items-end gap-1 md:gap-4 min-w-[600px] sm:min-w-0 px-2 lg:px-4">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                                        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                                            <div key={p} className="w-full border-t border-muted-foreground/10 relative">
                                                <span className="absolute left-1 -top-2.5 text-[10px] md:text-[11px] text-muted-foreground tabular-nums font-extrabold bg-card px-1">
                                                    {Math.round(maxMonthlyAmount * (1 - p)).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {monthlyData.map((item, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                                            <div className="w-full relative flex items-end justify-center min-h-[300px]">
                                                {item.amount > 0 && (
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-[10px] md:text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 font-bold border">
                                                        {item.amount.toLocaleString()}
                                                    </div>
                                                )}
                                                <div
                                                    className={`w-full max-w-[20px] md:max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:brightness-110 cursor-pointer ${selectedGLHeadId === 'ALL_EXPENSE' || glHeads.find(h => h.id === selectedGLHeadId)?.type === 'Expense'
                                                        ? 'bg-red-500 hover:bg-red-400'
                                                        : 'bg-primary hover:bg-primary/80'
                                                        }`}
                                                    style={{
                                                        height: maxMonthlyAmount > 0 ? `${(item.amount / maxMonthlyAmount) * 300}px` : '4px',
                                                        opacity: item.amount === 0 ? 0.3 : 1
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[10px] md:text-sm font-bold text-muted-foreground rotate-45 md:rotate-0 mt-3 whitespace-nowrap">
                                                {item.month}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mt-12 text-center text-xs text-muted-foreground border-t pt-4">
                            All amounts are in local currency. Data based on the Nepali (BS) Calendar for the selected year.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Filters Header - Moved here */}
                    <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-2 rounded-xl border">
                        <div className="flex rounded-md border bg-muted/50 p-1 h-fit">
                            <Button
                                variant="ghost"
                                onClick={() => setMode('month')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-sm transition-all h-7",
                                    mode === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                                )}
                            >
                                By Month
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setMode('date')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-sm transition-all h-7",
                                    mode === 'date' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                                )}
                            >
                                Date Range
                            </Button>
                        </div>

                        <div className="h-8 w-px bg-border hidden md:block" />

                        {mode === 'month' ? (
                            <div className="flex gap-2">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold"
                                >
                                    {NEPAL_MONTHS_BS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2 items-center">
                                <NepaliDatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    onClear={() => setStartDate('')}
                                    placeholder="Start Date"
                                    className="w-[140px] h-8 text-xs"
                                />
                                <span className="text-muted-foreground">-</span>
                                <NepaliDatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    onClear={() => setEndDate('')}
                                    placeholder="End Date"
                                    className="w-[140px] h-8 text-xs"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income Table */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                <h3 className="font-semibold text-sm">Income Breakdown</h3>
                            </div>
                            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b bg-primary text-white">
                                            <th className="h-10 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider">GL Head</th>
                                            <th className="h-10 px-4 text-right align-middle font-semibold text-xs uppercase tracking-wider">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {incomeItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="h-24 text-center text-muted-foreground italic">No income data found</td>
                                            </tr>
                                        ) : (
                                            incomeItems.map((item) => (
                                                <tr key={item.id} className="transition-colors hover:bg-muted/50 group">
                                                    <td className="p-4 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-foreground">{item.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {item.code && (
                                                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 rounded">{item.code}</span>
                                                                )}
                                                                <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-emerald-500 rounded-full"
                                                                        style={{ width: `${item.percentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle text-right font-bold text-emerald-700">
                                                        {item.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {incomeItems.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-emerald-50/50 font-bold border-t">
                                                <td className="p-3 px-4">Total Income</td>
                                                <td className="p-3 px-4 text-right text-emerald-700">{totalIncome.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Expense Table */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                                <h3 className="font-semibold text-sm">Expense Breakdown</h3>
                            </div>
                            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b bg-primary text-white">
                                            <th className="h-10 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider">GL Head</th>
                                            <th className="h-10 px-4 text-right align-middle font-semibold text-xs uppercase tracking-wider">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {expenseItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="h-24 text-center text-muted-foreground italic">No expense data found</td>
                                            </tr>
                                        ) : (
                                            expenseItems.map((item) => (
                                                <tr key={item.id} className="transition-colors hover:bg-muted/50 group">
                                                    <td className="p-4 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-foreground">{item.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {item.code && (
                                                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 rounded">{item.code}</span>
                                                                )}
                                                                <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-rose-500 rounded-full"
                                                                        style={{ width: `${item.percentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle text-right font-bold text-rose-700">
                                                        {item.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {expenseItems.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-rose-50/50 font-bold border-t">
                                                <td className="p-3 px-4">Total Expense</td>
                                                <td className="p-3 px-4 text-right text-rose-700">{totalExpense.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
