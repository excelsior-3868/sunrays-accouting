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
    const [activeView, setActiveView] = useState<'chart' | 'table' | 'individual'>('chart');
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
                // Normalize transactions
                // Income (Payments)
                const incomes = payData.flatMap((p: any) => {
                    // 1. Direct Income
                    if (!p.invoice_id) {
                        return [{
                            amount: p.amount,
                            gl_head_id: p.income_head_id,
                            date: p.payment_date,
                            type: 'Income'
                        }];
                    }

                    // 2. Invoice Payment Breakdown
                    const invoice = p.invoice;
                    if (invoice && invoice.items && invoice.items.length > 0) {
                        const totalInv = invoice.total_amount || 1;
                        const ratio = p.amount / totalInv;

                        return invoice.items.map((item: any) => ({
                            amount: item.amount * ratio,
                            gl_head_id: item.gl_head_id, // The specific Income Head (Tuition, Exam, etc.)
                            date: p.payment_date,
                            type: 'Income'
                        }));
                    }

                    // 3. Fallback (if no invoice details found)
                    return [{
                        amount: p.amount,
                        gl_head_id: p.payment_mode_gl_id, // This is technically Asset (Cash), but ensures total matches
                        date: p.payment_date,
                        type: 'Income'
                    }];
                });

                // However, "Total of Each GL Head" usually refers to the Head of Account.
                // For Fees: The Income GL is "Tuition Fee", "Exam Fee" etc. BUT `getPayments` only shows the total amount paid against an invoice. The Invoice contains the breakdown of Fee Heads.
                // This is complex. 
                // IF the user wants "Cash Account" vs "Bank Account", using `payment_mode_gl_id` is correct for Assets.
                // IF the user wants "Tuition Fee" vs "Bus Fee" (Income Heads), we need to look at Invoice Items.
                // But Payments are lump sum.
                // USUALLY "GL Head Report" implies Income/Expense Statement heads.
                // For simplicity in this system (Cash Basis-ish), Direct Income has `income_head_id`.
                // Fee Payments are usually credit to "Student Fees" or similar.
                // The `payment_mode_gl_id` is the DEBIT (Cash/Bank).
                // The CREDIT is the Income Source.
                // If I use `payment_mode_gl_id`, I am showing "Where money came IN" (Cash vs Bank).
                // If I want "What money is FOR", I need invoice details.
                // Given the existing `ReportsPage.tsx` logic:
                // `gl_head: p.invoice_id ? p.payment_mode_gl_id : p.income_head_id`
                // This mixes Asset (Cash) and Income (Direct).
                // I will stick to this logic for consistency, or standard GL practices.
                // Let's assume the user wants to see totals for whatever GL IDs are attached.

                // Expenses
                const expenses = expData.map(e => ({
                    amount: e.amount,
                    gl_head_id: e.expense_head_id, // Expense Head
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

    // Logic to calculate Date Range based on filters
    const dateRange = useMemo(() => {
        if (mode === 'date') {
            return {
                start: startDate ? new Date(startDate) : new Date('1970-01-01'),
                end: endDate ? new Date(endDate) : new Date('2100-01-01')
            };
        } else {
            // Month Mode: Calculate AD range for selected BS Year/Month
            // Start: 1st of Selected Month
            const startBs = new NepaliDate(selectedYear, selectedMonth, 1);
            const startAd = startBs.toJsDate(); // AD Date

            // End: Last day of month
            // Go to 1st of Next Month, subtract 1 day
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

    // Aggregate Data
    const reportData = useMemo(() => {
        const { start, end } = dateRange;

        // Filter transactions
        const filtered = transactions.filter((t: any) => {
            const d = new Date(t.date);
            // Compare timestamps or simple date strings?
            // Use timestamps for safety
            return d >= start && d <= end;
        });

        // Group by GL Head
        const grouped = new Map<string, number>();
        let totalSum = 0;

        filtered.forEach((t: any) => {
            if (!t.gl_head_id) return;
            const current = grouped.get(t.gl_head_id) || 0;
            grouped.set(t.gl_head_id, current + t.amount);
            totalSum += t.amount;
        });

        // Map to GLTotal objects
        const result: GLTotal[] = [];

        // Use all GL Heads (showing 0 if no transactions)
        glHeads.forEach(head => {
            const amount = grouped.get(head.id) || 0;
            // Filter: Only show heads with amount value (non-zero) or if they are "Child" heads in concept (but here we rely on amount as per user request "Show only those have Amount Value")
            // The user also mentioned "Only show Child GL". Usually transactions are only on Child GLs.
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

        // Sort by Amount desc, then by Name
        return result.sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });

    }, [transactions, dateRange, glHeads]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    // Generate BS Years for dropdown (current +/- 2)
    const years = [currentBsDate.getYear() - 1, currentBsDate.getYear(), currentBsDate.getYear() + 1];

    // Max amount for bar chart scaling
    const maxAmount = Math.max(...reportData.map(d => d.amount), 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">GL Head Report</h1>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border">

                {/* Mode Toggle */}
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

                {/* Filters */}
                {mode === 'month' ? (
                    <div className="flex gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
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
                <button
                    onClick={() => setActiveView('individual')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'individual' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Individual GL
                </button>
            </div>

            {/* Content */}
            {activeView === 'chart' ? (
                /* Bar Graph */
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Amounts by GL Head</h3>
                    </div>

                    <div className="space-y-4">
                        {reportData.map((item) => (
                            <div key={item.id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.name}</span>
                                        {item.code && <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.code}</span>}
                                    </div>
                                    <span className="text-muted-foreground">{item.amount.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${item.type === 'Expense' ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {reportData.length === 0 && <div className="text-center text-muted-foreground py-8">No data for selected period</div>}
                    </div>
                </div>
            ) : activeView === 'table' ? (
                /* Table Detail */
                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b bg-muted/50 transition-colors">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">GL Head</th>
                                {/* <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th> */}
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item) => (
                                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            {/* Icon Placeholder - looking like a document */}
                                            <div className="p-2 bg-muted rounded-md text-muted-foreground">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{item.name}</span>

                                                {/* Code Badge */}
                                                {item.code && (
                                                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                        {item.code}
                                                    </span>
                                                )}

                                                {/* Type Badge */}
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ml-1 ${item.type === 'Expense' ? 'border-red-200 bg-red-50 text-red-700' :
                                                    item.type === 'Income' ? 'border-green-200 bg-green-50 text-green-700' :
                                                        'border-blue-200 bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${item.type === 'Expense' ? 'border-red-200 bg-red-50 text-red-700' :
                                            item.type === 'Income' ? 'border-green-200 bg-green-50 text-green-700' :
                                                'border-blue-200 bg-blue-50 text-blue-700'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </td> */}
                                    <td className="p-4 align-middle text-right font-bold">
                                        {item.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Individual GL View */
                <div className="space-y-6">
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-lg mx-auto">
                        <h3 className="text-lg font-medium mb-4">Select GL Head</h3>
                        <SearchableSelect
                            options={glHeads.map(h => ({ value: h.id, label: h.code ? `${h.name} (${h.code})` : h.name, group: h.type }))}
                            value={selectedGLHeadId}
                            onChange={(val) => setSelectedGLHeadId(val)}
                            placeholder="Search GL Head..."
                            className="w-full"
                        />
                    </div>

                    {selectedGLHeadId && (
                        <div className="rounded-xl border bg-card text-card-foreground shadow p-8 max-w-lg mx-auto text-center">
                            {(() => {
                                // Find from reportData if available (filtered by date)
                                // If not found in reportData, it might have 0 amount, so we look in glHeads for display info
                                const head = glHeads.find(h => h.id === selectedGLHeadId);
                                const data = reportData.find(d => d.id === selectedGLHeadId);
                                const amount = data ? data.amount : 0;

                                return (
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{head?.type}</div>
                                        <h2 className="text-2xl font-bold">{head?.name} {head?.code && <span className="text-muted-foreground text-lg font-medium">({head.code})</span>}</h2>

                                        <div className="py-6">
                                            <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                                            <div className={`text-4xl font-bold ${head?.type === 'Expense' ? 'text-red-600' : 'text-green-600'}`}>
                                                {amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
