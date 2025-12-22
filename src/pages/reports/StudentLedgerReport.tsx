
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getInvoices, getPayments, getStudents, getFiscalYears } from '@/lib/api';
import { Loader2, Search, X, ListFilter } from 'lucide-react';
import { toNepali } from '@/lib/nepaliDate';
import { type FiscalYear } from '@/types';
import { Button } from '@/components/ui/button';

type LedgerEntry = {
    id: string;
    date: string;
    particulars: string;
    debit?: number;
    credit?: number;
    balance: number;
    type: 'Invoice' | 'Payment';
};

export default function StudentLedgerReport() {
    const [, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    // Fiscal Year State
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [selectedFyId, setSelectedFyId] = useState('');

    // Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Derived state for filtered list
    const filteredStudentSearchList = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 10);

    // Reset focused index when query changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchQuery]);

    // Load student list and fiscal years on mount
    useEffect(() => {
        Promise.all([
            getStudents(),
            getFiscalYears()
        ]).then(([studentsData, fyData]) => {
            // Ensure class_name is populated
            const normalized = studentsData.map((s: any) => ({
                ...s,
                class_name: s.class_name || s.class || 'Unassigned'
            }));
            setStudents(normalized);
            setFiscalYears(fyData || []);

            // Auto-select active FY
            const activeFy = fyData?.find((f: any) => f.is_active);
            if (activeFy) setSelectedFyId(activeFy.id);

            setInitLoaded(true);
        }).catch(console.error);
    }, []);

    const handleSearch = useCallback(async () => {
        if (!selectedStudentId) return;
        setLoading(true);

        try {
            const [allInvoices, allPayments] = await Promise.all([
                getInvoices(),
                getPayments()
            ]);

            // Determine Date Range from Selected Fiscal Year
            const selectedFy = fiscalYears.find(f => f.id === selectedFyId);
            const startDate = selectedFy ? new Date(selectedFy.start_date) : new Date('1970-01-01');
            const endDate = selectedFy ? new Date(selectedFy.end_date) : new Date('2100-12-31');

            const studentInvoices = allInvoices.filter(i => i.student_id === selectedStudentId);

            // Helper to check if date is before start date
            const isBefore = (dateStr: string) => new Date(dateStr) < startDate;
            // Helper to check if date is within range
            const isWithin = (dateStr: string) => {
                const d = new Date(dateStr);
                return d >= startDate && d <= endDate;
            };

            // Calculate Opening Balance (Transactions BEFORE Start Date)
            let openingBalance = 0;

            // 1. Invoices are DEBITS
            studentInvoices.forEach(inv => {
                const date = inv.created_at?.split('T')[0] || inv.due_date || '';
                if (isBefore(date)) {
                    openingBalance += inv.total_amount;
                }
            });

            // 2. Payments (Credits)
            allPayments
                // @ts-ignore
                .filter(p => p.invoice?.student_id === selectedStudentId)
                .forEach(pay => {
                    const date = pay.payment_date;
                    if (isBefore(date)) {
                        openingBalance -= pay.amount;
                    }
                });


            // Generate Ledger Entries WITHIN Range
            const debits = studentInvoices
                .filter(inv => {
                    const date = inv.created_at?.split('T')[0] || inv.due_date || '';
                    return isWithin(date);
                })
                .map(inv => ({
                    id: inv.id,
                    date: inv.created_at?.split('T')[0] || inv.due_date || '',
                    particulars: `Invoice #${inv.invoice_number} - ${inv.month || ''}`,
                    debit: inv.total_amount,
                    type: 'Invoice' as const,
                    timestamp: new Date(inv.created_at || inv.due_date).getTime()
                }));

            const credits = allPayments
                // @ts-ignore
                .filter(p => p.invoice?.student_id === selectedStudentId)
                .filter(pay => isWithin(pay.payment_date))
                .map(pay => ({
                    id: pay.id,
                    date: pay.payment_date,
                    particulars: `Payment Receipt ${pay.transaction_reference ? `(${pay.transaction_reference})` : ''}`,
                    credit: pay.amount,
                    type: 'Payment' as const,
                    timestamp: new Date(pay.payment_date).getTime()
                }));

            const rangeEntries = [...debits, ...credits].sort((a, b) => a.timestamp - b.timestamp);

            // Add Opening Balance as first entry
            const finalLedger = [];

            // Initial Balance Entry
            finalLedger.push({
                id: 'opening-balance',
                date: selectedFy ? selectedFy.start_date : '',
                particulars: 'Opening Balance (Previous Years)',
                balance: openingBalance,
                type: 'System' as any
            });

            let runningBalance = openingBalance;

            rangeEntries.forEach(entry => {
                const debit = (entry as any).debit || 0;
                const credit = (entry as any).credit || 0;

                runningBalance += debit;
                runningBalance -= credit;

                // @ts-ignore
                finalLedger.push({ ...entry, balance: runningBalance });
            });

            setLedger(finalLedger);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedStudentId, selectedFyId, fiscalYears]);

    // Effect to auto-load when student or FY changes
    useEffect(() => {
        if (selectedStudentId) {
            handleSearch();
        } else {
            setLedger([]);
        }
    }, [handleSearch, selectedStudentId]);

    if (!initLoaded) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Student Ledger</h1>
            </div>

            <div className="bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="w-full md:w-48 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <ListFilter className="h-3 w-3" /> Fiscal Year
                        </label>
                        <select
                            value={selectedFyId}
                            onChange={(e) => setSelectedFyId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="">All Time</option>
                            {fiscalYears.map(fy => (
                                <option key={fy.id} value={fy.id}>{fy.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <Search className="h-3 w-3" /> Student Search
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Student..."
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (selectedStudentId) setSelectedStudentId('');
                                }}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                onKeyDown={(e) => {
                                    if (!isSearchFocused) return;
                                    const options = filteredStudentSearchList;

                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (focusedIndex >= 0 && focusedIndex < options.length) {
                                            const selected = options[focusedIndex];
                                            setSearchQuery(selected.name);
                                            setSelectedStudentId(selected.id);
                                            setIsSearchFocused(false);
                                        }
                                    }
                                }}
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedStudentId('');
                                    }}
                                    className="absolute inset-y-0 right-0 h-full w-9 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}

                            {isSearchFocused && (searchQuery || filteredStudentSearchList.length > 0) && (
                                <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                                    {filteredStudentSearchList.map((s, i) => (
                                        <div
                                            key={s.id}
                                            className={cn(
                                                "px-4 py-2.5 cursor-pointer text-sm border-b last:border-0",
                                                focusedIndex === i ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted'
                                            )}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(s.name);
                                                setSelectedStudentId(s.id);
                                                setIsSearchFocused(false);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex justify-between">
                                                    <span className="font-bold">{s.name}</span>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{s.class_name}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">ID: {s.student_id}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredStudentSearchList.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No students found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {ledger.length > 0 && (
                <div className="space-y-4">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {ledger.map((entry) => (
                            <div key={entry.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{toNepali(entry.date)}</div>
                                        <div className="text-[9px] text-muted-foreground">{entry.date}</div>
                                    </div>
                                    <div className="text-right">
                                        {entry.debit && <div className="text-xs font-bold text-red-600">Debit: {entry.debit.toLocaleString()}</div>}
                                        {entry.credit && <div className="text-xs font-bold text-green-600">Credit: {entry.credit.toLocaleString()}</div>}
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-foreground">{entry.particulars}</div>
                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Balance</span>
                                    <span className="font-black text-foreground">NPR {entry.balance.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest">
                                    <th className="h-12 px-4 text-left align-middle">Date(BS)</th>
                                    <th className="h-12 px-4 text-left align-middle">Date(AD)</th>
                                    <th className="h-12 px-4 text-left align-middle">Particulars</th>
                                    <th className="h-12 px-4 text-right align-middle">Debit (Due)</th>
                                    <th className="h-12 px-4 text-right align-middle">Credit (Paid)</th>
                                    <th className="h-12 px-4 text-right align-middle">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ledger.map((entry) => (
                                    <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                                        <td className="p-4 align-middle font-medium whitespace-nowrap">{toNepali(entry.date)}</td>
                                        <td className="p-4 align-middle text-muted-foreground text-xs whitespace-nowrap">{entry.date}</td>
                                        <td className="p-4 align-middle font-medium">{entry.particulars}</td>
                                        <td className="p-4 align-middle text-right text-red-600 font-bold">{entry.debit ? entry.debit.toLocaleString() : '-'}</td>
                                        <td className="p-4 align-middle text-right text-green-600 font-bold">{entry.credit ? entry.credit.toLocaleString() : '-'}</td>
                                        <td className="p-4 align-middle text-right font-black text-lg">NPR {entry.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td colSpan={5} className="p-4 text-right text-[11px] uppercase tracking-widest text-muted-foreground">Closing Balance</td>
                                    <td className="p-4 text-right font-black text-xl text-blue-700">NPR {ledger[ledger.length - 1]?.balance.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }
        </div >
    );
}
