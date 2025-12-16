
import { useState, useEffect } from 'react';
import { getInvoices, getPayments, getStudents } from '@/lib/api';
import { Loader2, Search, X } from 'lucide-react';

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
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

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

    // Load student list on mount
    useEffect(() => {
        getStudents().then(data => {
            // Ensure class_name is populated
            const normalized = data.map((s: any) => ({
                ...s,
                class_name: s.class_name || s.class || 'Unassigned'
            }));
            setStudents(normalized);
            setInitLoaded(true);
        }).catch(console.error);
    }, []);

    const handleSearch = async () => {
        if (!selectedStudentId) return;
        setLoading(true);

        try {
            const [allInvoices, allPayments] = await Promise.all([
                getInvoices(),
                getPayments()
            ]);

            const studentInvoices = allInvoices.filter(i => i.student_id === selectedStudentId);

            // 1. Invoices are DEBITS (Money owed by student)
            const debits = studentInvoices.map(inv => ({
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
                .map(pay => ({
                    id: pay.id,
                    date: pay.payment_date,
                    particulars: `Payment Receipt ${pay.transaction_reference ? `(${pay.transaction_reference})` : ''}`,
                    credit: pay.amount,
                    type: 'Payment' as const,
                    timestamp: new Date(pay.payment_date).getTime()
                }));

            const allEntries = [...debits, ...credits].sort((a, b) => a.timestamp - b.timestamp);

            // Calculate Running Balance
            let runningBalance = 0;
            const finalLedger = allEntries.map(entry => {
                // @ts-ignore
                if (entry.debit) runningBalance += entry.debit;
                // @ts-ignore
                if (entry.credit) runningBalance -= entry.credit;
                return { ...entry, balance: runningBalance };
            });

            setLedger(finalLedger);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!initLoaded) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Student Ledger</h1>

            <div className="flex items-end gap-4 bg-card p-4 rounded-lg border">
                <div className="w-full max-w-[500px] relative">
                    <label className="text-sm font-medium mb-2 block">Select Student</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="pl-10 pr-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedStudentId) {
                                    setSelectedStudentId(''); // Reset selection if user types
                                }
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
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedStudentId('');
                                }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {isSearchFocused && (searchQuery || filteredStudentSearchList.length > 0) && (
                        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            {filteredStudentSearchList.map((s, i) => (
                                <div
                                    key={s.id}
                                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-muted ${focusedIndex === i ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        setSearchQuery(s.name);
                                        setSelectedStudentId(s.id);
                                        setIsSearchFocused(false);
                                    }}
                                >
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-muted-foreground flex justify-between">
                                        <span>Class: {s.class_name}</span>
                                        <span>ID: {s.student_id}</span>
                                    </div>
                                </div>
                            ))}
                            {filteredStudentSearchList.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No results</div>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    disabled={!selectedStudentId || loading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mb-[1px]" // MB align
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    View Ledger
                </button>
            </div>

            {ledger.length > 0 && (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Particulars</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Debit (Due)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Credit (Paid)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map((entry) => (
                                <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{entry.date}</td>
                                    <td className="p-4 align-middle">{entry.particulars}</td>
                                    <td className="p-4 align-middle text-right text-red-600">{entry.debit ? entry.debit.toLocaleString() : '-'}</td>
                                    <td className="p-4 align-middle text-right text-green-600">{entry.credit ? entry.credit.toLocaleString() : '-'}</td>
                                    <td className="p-4 align-middle text-right font-bold">{entry.balance.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-muted/50 font-bold">
                                <td colSpan={4} className="p-4 text-right">Closing Balance</td>
                                <td className="p-4 text-right">{ledger[ledger.length - 1]?.balance.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
