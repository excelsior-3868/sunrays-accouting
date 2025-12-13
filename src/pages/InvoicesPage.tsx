import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Search, X } from 'lucide-react';
import { getInvoices, createInvoice, getFeeStructures, getFiscalYears, getStudents } from '@/lib/api';
import { type Invoice, type FeeStructure, type FiscalYear, type Student } from '@/types';

export default function InvoicesPage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Dependent Data
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);

    // Form State
    const [selectedStructureId, setSelectedStructureId] = useState('');
    const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split('T')[0]);

    // Search State
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Generation Mode State
    const [generationMode, setGenerationMode] = useState<'individual' | 'batch'>('individual');

    const fetchData = async () => {
        try {
            const [invData, stData, fyData, studData] = await Promise.all([
                getInvoices(),
                getFeeStructures(),
                getFiscalYears(),
                getStudents()
            ]);
            setInvoices(invData);
            setFeeStructures(stData);
            setFiscalYears(fyData.filter(fy => fy.is_active)); // Only active year for creation
            setAllStudents(studData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Close search dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const structure = feeStructures.find(s => s.id === selectedStructureId);

        if (!structure || !structure.items) return;

        const fyId = formData.get('fiscal_year_id') as string;
        const dueDate = formData.get('due_date') as string;

        try {
            if (generationMode === 'individual') {
                if (!selectedStudent) return;

                const newInvoice = {
                    student_id: selectedStudent.id,
                    student_name: selectedStudent.name,
                    fiscal_year_id: fyId,
                    invoice_number: `INV-${Date.now()}`,
                    total_amount: structure.amount,
                    due_date: dueDate,
                    status: 'Unpaid' as const,
                };

                const items = structure.items.map(item => ({
                    gl_head_id: item.gl_head_id,
                    description: structure.name,
                    amount: item.amount
                }));

                await createInvoice(newInvoice, items);
            } else {
                // Batch Generation
                if (!structure.class_name) {
                    alert('Selected fee structure does not have a defined class.');
                    return;
                }

                const studentsInClass = allStudents.filter(s => s.class === structure.class_name);

                if (studentsInClass.length === 0) {
                    alert(`No students found for class ${structure.class_name}`);
                    return;
                }

                // Generate invoices sequentially to avoid overwhelming the server/rate limits
                // or parallel if confident. Let's do sequential for safety and unique invoice numbers.
                let successCount = 0;

                for (const student of studentsInClass) {
                    const newInvoice = {
                        student_id: student.id,
                        student_name: student.name,
                        fiscal_year_id: fyId,
                        invoice_number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Ensure unique
                        total_amount: structure.amount,
                        due_date: dueDate,
                        status: 'Unpaid' as const,
                    };

                    const items = structure.items.map(item => ({
                        gl_head_id: item.gl_head_id,
                        description: structure.name,
                        amount: item.amount
                    }));

                    await createInvoice(newInvoice, items);
                    successCount++;
                }
                alert(`Successfully generated ${successCount} invoices for class ${structure.class_name}`);
            }

            setIsDialogOpen(false);
            // Reset form
            setSelectedStudent(null);
            setStudentSearch('');
            setSelectedStructureId('');
            setGenerationMode('individual');
            fetchData();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('An error occurred while creating invoices.');
        }
    };

    const filteredStudents = allStudents.filter(student =>
        student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (student.roll_number && student.roll_number.toString().includes(studentSearch))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
                <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Create Invoice
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-md border bg-card">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Invoice #</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Student</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr
                                    key={inv.id}
                                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                    onClick={() => navigate(`/invoices/${inv.id}`)}
                                >
                                    <td className="p-4 align-middle font-medium">{inv.invoice_number}</td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col">
                                            <span>{inv.student_name}</span>
                                            <span className="text-xs text-muted-foreground">{inv.student_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">{inv.created_at?.split('T')[0]}</td>
                                    <td className="p-4 align-middle">NPR {inv.total_amount}</td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${inv.status === 'Paid' ? 'bg-green-500/15 text-green-700' :
                                            inv.status === 'Partial' ? 'bg-yellow-500/15 text-yellow-700' :
                                                'bg-red-500/15 text-red-700'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No invoices found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 className="text-lg font-semibold mb-4">New Invoice</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Generation Mode</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                name="generation_mode"
                                                value="individual"
                                                checked={generationMode === 'individual'}
                                                onChange={() => setGenerationMode('individual')}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm">Individual Student</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                name="generation_mode"
                                                value="batch"
                                                checked={generationMode === 'batch'}
                                                onChange={() => setGenerationMode('batch')}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm">Batch (By Fee Structure Class)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fiscal Year</label>
                                    <select name="fiscal_year_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                        {fiscalYears.map(fy => (
                                            <option key={fy.id} value={fy.id}>{fy.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {generationMode === 'individual' && (
                                    <div className="space-y-2" ref={searchRef}>
                                        <label className="text-sm font-medium">Student</label>
                                        {selectedStudent ? (
                                            <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{selectedStudent.name}</span>
                                                    <span className="text-xs text-muted-foreground">Class: {selectedStudent.class} {selectedStudent.roll_number ? `| Roll: ${selectedStudent.roll_number}` : ''}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedStudent(null); setStudentSearch(''); }}
                                                    className="ml-2 hover:bg-background rounded-full p-1"
                                                >
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search student by name..."
                                                        value={studentSearch}
                                                        onChange={(e) => {
                                                            setStudentSearch(e.target.value);
                                                            setIsSearchOpen(true);
                                                        }}
                                                        onFocus={() => setIsSearchOpen(true)}
                                                        className="flex h-10 w-full rounded-md border border-input bg-background pl-8 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    />
                                                </div>
                                                {isSearchOpen && studentSearch.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[200px] overflow-y-auto">
                                                        {filteredStudents.length > 0 ? (
                                                            filteredStudents.map(student => (
                                                                <div
                                                                    key={student.id}
                                                                    className="flex flex-col p-2 hover:bg-muted cursor-pointer text-sm"
                                                                    onClick={() => {
                                                                        setSelectedStudent(student);
                                                                        setIsSearchOpen(false);
                                                                        setStudentSearch('');
                                                                    }}
                                                                >
                                                                    <span className="font-medium">{student.name}</span>
                                                                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                                                                        <span>{student.class}</span>
                                                                        <span>{student.roll_number ? `Roll: ${student.roll_number}` : ''}</span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                                No students found.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fee Structure (Template)</label>
                                    <select
                                        name="fee_structure_id"
                                        required
                                        value={selectedStructureId}
                                        onChange={(e) => setSelectedStructureId(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select Structure</option>
                                        {feeStructures.map(st => (
                                            <option key={st.id} value={st.id}>
                                                {st.name} (NPR {st.amount}) {st.class_name ? `[${st.class_name}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {generationMode === 'batch' && (
                                        <p className="text-xs text-muted-foreground">
                                            Selecting this will filter students matching the structure's class.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Due Date</label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        required
                                        value={invoiceDueDate}
                                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" disabled={!selectedStructureId || (generationMode === 'individual' && !selectedStudent)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {generationMode === 'batch' ? 'Generate Batch Invoices' : 'Create Invoice'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
