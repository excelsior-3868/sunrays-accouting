import { useEffect, useState } from 'react';
import { getTeachers } from '@/lib/api';
import { type Teacher } from '@/types';
import { Loader2 } from 'lucide-react';

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const data = await getTeachers();
                setTeachers(data);
            } catch (error) {
                console.error('Error fetching teachers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeachers();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-md border bg-card">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((teacher) => (
                                <tr
                                    key={teacher.id}
                                    className="border-b transition-colors hover:bg-muted/50"
                                >
                                    <td className="p-4 align-middle font-medium">{teacher.first_name} {teacher.last_name}</td>
                                    <td className="p-4 align-middle">{teacher.email}</td>
                                    <td className="p-4 align-middle">{teacher.phone || '-'}</td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No teachers found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
