import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { getTeachers, getStaffMembers, createStaffMember } from '@/lib/api';


type StaffDisplay = {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    designation?: string;
    employment_type?: string;
    service_status?: string;
};

export default function StaffsPage() {
    const [staffs, setStaffs] = useState<StaffDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffDisplay | null>(null);

    // Filter states
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStaffs = async () => {
        try {
            const [teachersData, staffData] = await Promise.all([
                getTeachers(),
                getStaffMembers()
            ]);

            // Normalize Teachers
            const normalizedTeachers: StaffDisplay[] = teachersData.map(t => ({
                id: t.id,
                first_name: t.first_name,
                last_name: t.last_name,
                email: t.email,
                phone: t.phone,
                address: t.address,
                category: t.category || 'Teaching Staff',
                designation: t.designation || 'Teacher',
                employment_type: 'Permanent', // Default for now
                service_status: 'Active' // Default
            }));

            // Normalize Support Staff
            const normalizedStaff: StaffDisplay[] = staffData.map(s => ({
                id: s.id,
                first_name: s.first_name,
                last_name: s.last_name,
                phone: s.mobile_number,
                address: s.address,
                category: s.category || 'Support Staff',
                designation: s.designation,
                employment_type: s.employment_type,
                service_status: s.service_status
            }));

            setStaffs([...normalizedTeachers, ...normalizedStaff]);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffs();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const category = formData.get('category') as string;
        const email = formData.get('email') as string;

        const commonData = {
            first_name: formData.get('first_name') as string,
            last_name: formData.get('last_name') as string,
            address: formData.get('address') as string,
            designation: formData.get('designation') as string,
        };

        try {
            if (editingStaff) {
                // UPDATE
                if (editingStaff.category === 'Teaching Staff') {
                    const teacherUpdates = {
                        ...commonData,
                        phone: formData.get('phone') as string,
                        email: email, // Required for Teacher
                        // Teachers might not have employment_type/service_status columns yet
                    };
                    await import('@/lib/api').then(m => m.updateTeacher(editingStaff.id, teacherUpdates));
                } else {
                    const staffUpdates = {
                        ...commonData,
                        mobile_number: formData.get('phone') as string,
                        category: category,
                        employment_type: formData.get('employment_type') as string,
                        service_status: formData.get('service_status') as string,
                    };
                    await import('@/lib/api').then(m => m.updateStaffMember(editingStaff.id, staffUpdates));
                }
                alert('Staff updated successfully!');
            } else {
                // CREATE
                if (category === 'Teaching Staff') {
                    const newTeacher = {
                        ...commonData,
                        phone: formData.get('phone') as string,
                        email: email, // Required for Teacher
                        created_at: new Date().toISOString()
                    };
                    await import('@/lib/api').then(m => m.createTeacher(newTeacher));
                } else {
                    const newStaff = {
                        ...commonData,
                        mobile_number: formData.get('phone') as string,
                        category: category,
                        employment_type: formData.get('employment_type') as string,
                        service_status: formData.get('service_status') as string,
                    };
                    await createStaffMember(newStaff);
                }
                alert('Staff created successfully!');
            }
            setIsDialogOpen(false);
            setEditingStaff(null);
            fetchStaffs();
        } catch (error) {
            console.error('Error saving staff:', error);
            alert('Failed to save staff.');
        }
    };

    // ... filteredStaffs ...
    const filteredStaffs = staffs.filter(staff => {
        const category = staff.category || 'Teaching Staff';
        const matchesCategory = categoryFilter ? category === categoryFilter : true;
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            staff.first_name.toLowerCase().includes(search) ||
            staff.last_name.toLowerCase().includes(search) ||
            (staff.designation || '').toLowerCase().includes(search);

        return matchesCategory && matchesSearch;
    });

    const handleEdit = (staff: StaffDisplay) => {
        setEditingStaff(staff);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                <button
                    onClick={() => { setEditingStaff(null); setIsDialogOpen(true); }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Staff
                </button>
            </div>

            <div className="flex gap-4 items-center">
                <input
                    type="search"
                    placeholder="Search by name or designation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                    <option value="">All Categories</option>
                    <option value="Teaching Staff">Teaching Staff</option>
                    <option value="Support Staff">Support Staff</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredStaffs.map((staff) => (
                                <tr key={staff.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{staff.first_name} {staff.last_name}</td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex items-center w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${staff.category === 'Support Staff'
                                                ? 'bg-blue-500/15 text-blue-700'
                                                : 'bg-green-500/15 text-green-700'
                                                }`}>
                                                {staff.category || 'Teaching Staff'}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">{staff.designation}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">{staff.employment_type || '-'}</span>
                                            <span className={`text-xs ${staff.service_status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>
                                                {staff.service_status || 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col text-xs text-muted-foreground">
                                            {staff.email && <span className="mb-0.5">{staff.email}</span>}
                                            <span>{staff.phone}</span>
                                            <span>{staff.address}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <button onClick={() => handleEdit(staff)} className="text-primary hover:underline text-sm font-medium">Edit</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStaffs.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No staff found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h3>
                            <button onClick={() => setIsDialogOpen(false)} className="hover:bg-muted p-1 rounded-full"><X className="h-4 w-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">First Name</label>
                                    <input name="first_name" required defaultValue={editingStaff?.first_name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Last Name</label>
                                    <input name="last_name" required defaultValue={editingStaff?.last_name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email <span className="text-muted-foreground text-xs">(Required for Teachers)</span></label>
                                <input type="email" name="email" defaultValue={editingStaff?.email} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mobile Number</label>
                                <input type="tel" name="phone" required defaultValue={editingStaff?.phone} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Address</label>
                                <input name="address" defaultValue={editingStaff?.address} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select name="category" required defaultValue={editingStaff?.category || 'Support Staff'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="Teaching Staff">Teaching Staff</option>
                                        <option value="Support Staff">Support Staff</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Designation</label>
                                    <select name="designation" required defaultValue={editingStaff?.designation} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="">Select Designation</option>
                                        <optgroup label="Teaching">
                                            <option value="Teacher">Teacher</option>
                                            <option value="Head Teacher">Head Teacher</option>
                                        </optgroup>
                                        <optgroup label="Support">
                                            <option value="Cook">Cook</option>
                                            <option value="Helper">Helper</option>
                                            <option value="Cleaner">Cleaner</option>
                                            <option value="Driver">Driver</option>
                                            <option value="Security">Security</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employment Type</label>
                                    <select name="employment_type" required defaultValue={editingStaff?.employment_type} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="Permanent">Permanent</option>
                                        <option value="Temporary">Temporary</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Probation">Probation</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Substitute / Relief">Substitute / Relief</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Service Status</label>
                                    <select name="service_status" required defaultValue={editingStaff?.service_status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="Active">Active</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Resigned">Resigned</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{editingStaff ? 'Update Staff' : 'Create Staff'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

}
