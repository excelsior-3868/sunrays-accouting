import { useEffect, useState } from 'react';
import { getInvoices, getStudents } from '@/lib/api';
import { Loader2, Search, Filter, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function DefaultersReport() {
    const [loading, setLoading] = useState(true);
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [allowedClasses] = useState<string[]>(['Play Group', 'Nursery', 'LKG', 'UKG']);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [allStudentNames, setAllStudentNames] = useState<{ id: string, name: string, class_name: string }[]>([]);

    // Keyboard Navigation
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Derived state for filtered list
    const filteredStudentSearchList = allStudentNames.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);

    // Reset focused index when query changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchQuery]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch invoices and students to get class info
            const [invoices, students] = await Promise.all([
                getInvoices(),
                getStudents() // We need this to get class_name for each student
            ]);

            const studentClassMap = new Map(students.map((s: any) => [s.id, s.class_name || s.class || 'Unassigned']));

            setAllStudentNames(students.map((s: any) => ({ id: s.id, name: s.name, class_name: s.class_name || s.class || 'Unassigned' }))); // Save names for search

            // Filter classes as per request: Only PG, Nursery, LKG, UKG
            // If the data has 'Play Group', we keep it. If it has 'PG', we keep it.
            // We'll enforce the specific list requested by the user, assuming data matches or mapped.
            // For now, I will hardcode the subset requested and ensure 'All' option is there.
            // setAvailableClasses(classes); // OLD logic removed

            const unpaid = invoices.filter(inv => inv.status !== 'Paid');

            // Group by student
            const studentMap = new Map();

            unpaid.forEach(inv => {
                const existing = studentMap.get(inv.student_id) || {
                    student_id: inv.student_id,
                    student_name: inv.student_name,
                    class_name: studentClassMap.get(inv.student_id) || 'Unknown',
                    total_due: 0,
                    invoices: []
                };

                existing.total_due += inv.total_amount;
                existing.invoices.push(inv);
                studentMap.set(inv.student_id, existing);
            });

            setDefaulters(Array.from(studentMap.values()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDefaulters = defaulters.filter(d => {
        if (selectedClass !== 'All' && d.class_name !== selectedClass) return false;
        if (searchQuery && !d.student_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Defaulters / Due Report</h1>
                <div className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-600"></span>
                    Pending Dues Found
                </div>
            </div>

            <div className="bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
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
                                placeholder="Start typing student name..."
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                                            setIsSearchFocused(false);
                                        }
                                    }
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
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
                                                setIsSearchFocused(false);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold">{s.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Class: {s.class_name}</span>
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

                    <div className="w-full md:w-60 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Class Filter
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="All">All Classes</option>
                            {allowedClasses.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {filteredDefaulters.map((d) => (
                        <div key={d.student_id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="font-bold text-lg leading-tight text-foreground">{d.student_name}</div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">ID: {d.student_id.split('-')[0]}..</span>
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                                            {d.class_name}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Invoices</span>
                                    <div className="text-xs font-bold">{d.invoices.length} Pending</div>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Due</span>
                                    <div className="text-sm font-black text-red-600">NPR {d.total_due.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredDefaulters.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground bg-card border rounded-lg italic">No outstanding dues found. Excellent!</div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest">
                                <th className="h-12 px-4 text-left align-middle">Student ID</th>
                                <th className="h-12 px-4 text-left align-middle">Name</th>
                                <th className="h-12 px-4 text-left align-middle">Class</th>
                                <th className="h-12 px-4 text-center align-middle">Pending Invoices</th>
                                <th className="h-12 px-4 text-right align-middle">Total Due</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredDefaulters.map((d) => (
                                <tr key={d.student_id} className="transition-colors hover:bg-slate-50">
                                    <td className="p-4 align-middle text-xs font-mono text-muted-foreground">{d.student_id}</td>
                                    <td className="p-4 align-middle font-bold text-foreground">{d.student_name}</td>
                                    <td className="p-4 align-middle">
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                                            {d.class_name}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-center font-bold">{d.invoices.length}</td>
                                    <td className="p-4 align-middle text-right text-red-600 font-black text-lg">NPR {d.total_due.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredDefaulters.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground font-medium bg-slate-50/50">No outstanding dues found matching your filters.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
