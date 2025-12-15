import { useEffect, useState } from 'react';
import { getStudents } from '@/lib/api';
import { type Student } from '@/types';
import { Loader2 } from 'lucide-react';

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await getStudents();
                setStudents(data);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Students</h1>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Class</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Roll No</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Father's Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Mobile</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr
                                    key={student.id}
                                    className="border-b transition-colors hover:bg-muted/50"
                                >
                                    <td className="p-4 align-middle font-medium">{student.name}</td>
                                    <td className="p-4 align-middle">{student.class}</td>
                                    <td className="p-4 align-middle">{student.roll_number}</td>
                                    <td className="p-4 align-middle">{student.father_name || '-'}</td>
                                    <td className="p-4 align-middle">{student.father_mobile || '-'}</td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No students found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
