import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, UserPlus, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Create form state
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('admin');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('user');

    // Visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [createLoading, setCreateLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            if (newUserPassword !== newUserConfirmPassword) {
                alert("Passwords do not match");
                setCreateLoading(false);
                return;
            }

            if (!newUserPassword) {
                alert("Password is required for initial creation.");
                setCreateLoading(false);
                return;
            }

            // Attempt to create user via Auth
            const { data, error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        full_name: newUserName,
                        role: newUserRole
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                setNewUserName('');
                setNewUserEmail('');
                setNewUserRole('admin');
                setNewUserPassword('');
                setNewUserConfirmPassword('');
                setIsCreateModalOpen(false);
                alert('User created successfully! Please check email for confirmation if enabled.');
                // Note: Fetching might still fail if public.users doesn't exist, but creation worked.
                fetchUsers();
            }
        } catch (error: any) {
            alert('Error creating user: ' + error.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setEditName(user.full_name || '');
        setEditRole(user.role || 'user');
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setUpdateLoading(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editName,
                    role: editRole
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setEditingUser(null);
            fetchUsers();
            alert('User updated successfully.');
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert('Error updating user: ' + error.message);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDelete = async (user: any) => {
        if (!confirm(`Are you sure you want to delete user "${user.full_name || user.email}"? This will only remove their profile from this list. They may still exist in the Authentication system.`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

            if (error) throw error;
            fetchUsers();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user: " + error.message);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground">Manage system users and access.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <UserPlus className="h-4 w-4" />
                    Add User
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    {isSearchOpen && (searchQuery.length > 0 || users.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSearchQuery(user.full_name || user.email);
                                            setIsSearchOpen(false);
                                        }}
                                    >
                                        <div className="font-medium">{user.full_name || 'No Name'}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">No users found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border bg-white overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90 data-[state=selected]:bg-muted">
                                <th className="h-10 px-4 text-left align-middle font-medium">Name</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Email</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Role</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Created At</th>
                                <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{user.full_name || '-'}</td>
                                        <td className="p-4 align-middle">{user.email}</td>
                                        <td className="p-4 align-middle capitalize">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${user.role === 'admin' ? 'bg-red-500/15 text-red-700' : 'bg-blue-500/15 text-blue-700'
                                                }`}>
                                                {user.role || 'User'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="inline-flex items-center justify-center rounded-md bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100"
                                                    title="Edit User"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="inline-flex items-center justify-center rounded-md bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg bg-white">
                        <h3 className="mb-4 text-lg font-semibold">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name (Display Name)</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                    <option value="view_only">View Only</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <p className="text-xs text-muted-foreground">User will receive an email to set their password (if configured), or set initial here.</p>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 pr-10 text-sm bg-transparent"
                                        placeholder="Initial password (required)"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={newUserConfirmPassword}
                                        onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 pr-10 text-sm bg-transparent"
                                        placeholder="Confirm password"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg bg-white">
                        <h3 className="mb-4 text-lg font-semibold">Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                    <option value="view_only">View Only</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateLoading}
                                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {updateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
