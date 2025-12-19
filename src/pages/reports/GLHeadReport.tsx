import { useState, useEffect, useMemo } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { getPayments, getExpenses, getGLHeads } from '@/lib/api';
import { type GLHead } from '@/types';
import NepaliDate from 'nepali-date-converter';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import SearchableSelect from '@/components/SearchableSelect';

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
    const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
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

    const reportData = useMemo(() => {
        const { start, end } = dateRange;
        const filtered = transactions.filter((t: any) => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const grouped = new Map<string, number>();
        let totalSum = 0;

        filtered.forEach((t: any) => {
            if (!t.gl_head_id) return;
            const current = grouped.get(t.gl_head_id) || 0;
            grouped.set(t.gl_head_id, current + t.amount);
            totalSum += t.amount;
        });

        const result: GLTotal[] = [];
        glHeads.forEach(head => {
            const amount = grouped.get(head.id) || 0;
            if (amount !== 0) {
                result.push({
                    id: head.id,
                    name: head.name,
                    code: head.code,
                    type: head.type,
                    amount: amount,
                    percentage: totalSum > 0 ? (amount / totalSum) * 100 : 0
                });
            }
        });

        return result.sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });
    }, [transactions, dateRange, glHeads]);

    const monthlyData = useMemo(() => {
        if (!selectedGLHeadId) return [];
        const glTransactions = transactions.filter(t => t.gl_head_id === selectedGLHeadId);

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
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">GL Head Report</h1>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveView('chart')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'chart' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Chart View
                </button>
                <button
                    onClick={() => setActiveView('table')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'table' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Table Data
                </button>
            </div>

            {/* Content */}
            {activeView === 'chart' ? (
                <div className="space-y-6">
                    {/* GL Selection for Chart */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Select GL Head for Monthly Analysis</label>
                                <SearchableSelect
                                    options={glHeads.map(h => ({ value: h.id, label: h.code ? `${h.name} (${h.code})` : h.name, group: h.type }))}
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
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">Month Wise Amount - {glHeads.find(h => h.id === selectedGLHeadId)?.name || 'Select a GL Head'}</h3>
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
                                                    className={`w-full max-w-[20px] md:max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:brightness-110 cursor-pointer ${glHeads.find(h => h.id === selectedGLHeadId)?.type === 'Expense' ? 'bg-red-500 hover:bg-red-400' : 'bg-primary hover:bg-primary/80'}`}
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
                <div className="space-y-6">
                    {/* Controls Moved Inside Table Tab */}
                    <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border">
                        <div className="flex rounded-md border bg-muted p-1 h-fit">
                            <button
                                onClick={() => setMode('month')}
                                className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${mode === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                By Month
                            </button>
                            <button
                                onClick={() => setMode('date')}
                                className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${mode === 'date' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Date Range
                            </button>
                        </div>

                        <div className="h-8 w-px bg-border hidden md:block" />

                        {mode === 'month' ? (
                            <div className="flex gap-2">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold"
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
                                    className="w-[140px]"
                                />
                                <span className="text-muted-foreground">-</span>
                                <NepaliDatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    onClear={() => setEndDate('')}
                                    placeholder="End Date"
                                    className="w-[140px]"
                                />
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b bg-muted/50 transition-colors">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">GL Head</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((item) => (
                                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-muted rounded-md text-muted-foreground">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                    {item.code && (
                                                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                            {item.code}
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ml-1 ${item.type === 'Expense' ? 'border-red-200 bg-red-50 text-red-700' :
                                                        item.type === 'Income' ? 'border-green-200 bg-green-50 text-green-700' :
                                                            'border-blue-200 bg-blue-50 text-blue-700'
                                                        }`}>
                                                        {item.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right font-bold">
                                            {item.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
