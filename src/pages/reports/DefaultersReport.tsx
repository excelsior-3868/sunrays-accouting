import { useEffect, useState } from 'react';
import { getInvoices, getStudents } from '@/lib/api';
import { Loader2, Search, Filter, X } from 'lucide-react';

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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Defaulters / Due Report</h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                {/* Student Search */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Student..."
                        className="pl-10 pr-8 h-9 w-[400px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            {filteredStudentSearchList.map((s, i) => (
                                <div
                                    key={s.id}
                                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-muted ${focusedIndex === i ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        setSearchQuery(s.name);
                                        setIsSearchFocused(false);
                                    }}
                                >
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-muted-foreground">Class: {s.class_name}</div>
                                </div>
                            ))}
                            {filteredStudentSearchList.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No results</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Class:</span>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-40"
                    >
                        <option value="All">All Classes</option>
                        {allowedClasses.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                            <th className="h-12 px-4 text-left align-middle font-medium">Student ID</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Class</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Pending Invoices</th>
                            <th className="h-12 px-4 text-right align-middle font-medium">Total Due</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDefaulters.map((d) => (
                            <tr key={d.student_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle">{d.student_id}</td>
                                <td className="p-4 align-middle font-medium">{d.student_name}</td>
                                <td className="p-4 align-middle">
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                        {d.class_name}
                                    </span>
                                </td>
                                <td className="p-4 align-middle">{d.invoices.length}</td>
                                <td className="p-4 align-middle text-right text-red-600 font-bold">NPR {d.total_due}</td>
                            </tr>
                        ))}
                        {filteredDefaulters.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No dues found. Great job!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
