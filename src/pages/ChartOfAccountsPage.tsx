import { useEffect, useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { getGLHeads, createGLHead, deleteGLHead } from '@/lib/api';
import { type GLHead, type GLHeadType } from '@/types';
import { cn } from '@/lib/utils'; // Assuming you have this utility

export default function ChartOfAccountsPage() {
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Filter state
    const [selectedType, setSelectedType] = useState<GLHeadType | 'All'>('All');

    const fetchHeads = async () => {
        try {
            const data = await getGLHeads();
            setGlHeads(data);
        } catch (error) {
            console.error('Error fetching GL heads:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHeads();
    }, []);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const parentId = formData.get('parent_id') as string;

        const newHead = {
            name: formData.get('name') as string,
            type: formData.get('type') as GLHeadType,
            code: formData.get('code') as string,
            parent_id: parentId === 'none' ? undefined : parentId,
            description: formData.get('description') as string,
        };

        try {
            await createGLHead(newHead);
            setIsDialogOpen(false);
            fetchHeads();
        } catch (error) {
            console.error('Error creating GL head:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this GL Head?')) return;
        try {
            await deleteGLHead(id);
            fetchHeads();
        } catch (error) {
            console.error('Error deleting GL head:', error);
        }
    }


    // Build Tree
    const buildTree = (heads: GLHead[]) => {
        const map = new Map<string, GLHead>();
        const roots: GLHead[] = [];

        // Initialize map
        heads.forEach(h => map.set(h.id, { ...h, children: [] }));

        // Build hierarchy
        heads.forEach(h => {
            if (h.parent_id && map.has(h.parent_id)) {
                map.get(h.parent_id)!.children!.push(map.get(h.id)!);
            } else {
                roots.push(map.get(h.id)!);
            }
        });

        return roots;
    };

    const treeData = buildTree(glHeads).filter(node => selectedType === 'All' || node.type === selectedType);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedNodes(newExpanded);
    };

    const renderTree = (nodes: GLHead[], level = 0) => {
        return nodes.map(node => (
            <div key={node.id}>
                <div
                    className={cn(
                        "flex items-center py-2 px-2 hover:bg-muted/50 rounded-md group text-sm",
                        level > 0 && "ml-6"
                    )}
                >
                    <div className="flex-1 flex items-center gap-2">
                        {node.children && node.children.length > 0 ? (
                            <button onClick={() => toggleExpand(node.id)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                {expandedNodes.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        ) : <span className="w-6" />}

                        {node.children && node.children.length > 0 ? <Folder className="h-4 w-4 text-blue-500/80" /> : <FileText className="h-4 w-4 text-muted-foreground" />}

                        <span className="font-medium">{node.name}</span>
                        {node.code && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2 font-mono">{node.code}</span>}
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full ml-2 border",
                            node.type === 'Income' && "bg-green-500/10 text-green-700 border-green-200",
                            node.type === 'Expense' && "bg-red-500/10 text-red-700 border-red-200",
                            node.type === 'Asset' && "bg-blue-500/10 text-blue-700 border-blue-200",
                            node.type === 'Liability' && "bg-orange-500/10 text-orange-700 border-orange-200",
                        )}>
                            {node.type}
                        </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                        <button onClick={() => handleDelete(node.id)} className="text-xs text-destructive hover:underline">Delete</button>
                    </div>
                </div>
                {node.children && node.children.length > 0 && expandedNodes.has(node.id) && (
                    <div className="border-l border-border/50 ml-5 pl-1">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
                <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Add GL Head
                </button>
            </div>

            <div className="flex gap-2 pb-4 border-b">
                {['All', 'Income', 'Expense', 'Asset', 'Liability'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type as any)}
                        className={cn(
                            "px-3 py-1 text-sm rounded-full border transition-colors",
                            selectedType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        )}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div className="border rounded-md p-4 bg-card min-h-[400px]">
                {loading ? (
                    <div className="text-center text-muted-foreground">Loading...</div>
                ) : treeData.length > 0 ? (
                    renderTree(treeData)
                ) : (
                    <div className="text-center text-muted-foreground py-10">No GL heads found. Create one to get started.</div>
                )}
            </div>

            {/* Simple Modal Implementation */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">Add GL Head</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input name="name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Code (Optional)</label>
                                <input name="code" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <select name="type" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                        <option value="Income">Income</option>
                                        <option value="Expense">Expense</option>
                                        <option value="Asset">Asset</option>
                                        <option value="Liability">Liability</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Parent Head</label>
                                    <select name="parent_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                        <option value="none">None (Root)</option>
                                        {glHeads.map(h => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea name="description" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
