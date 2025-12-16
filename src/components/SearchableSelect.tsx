import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    group?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", className = "" }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Find selected option to display its label
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchTerm, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
                    onChange(filteredOptions[selectedIndex].value);
                    setIsOpen(false);
                    setSearchTerm('');
                } else if (filteredOptions.length > 0 && selectedIndex === -1) {
                    // Should we select first one? or do nothing? User might expect nothing.
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    // Grouping logic for display
    const groupedOptions = filteredOptions.reduce((acc, opt) => {
        const group = opt.group || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(opt);
        return acc;
    }, {} as Record<string, Option[]>);

    const hasGroups = Object.keys(groupedOptions).length > 1 || (Object.keys(groupedOptions).length === 1 && Object.keys(groupedOptions)[0] !== 'Other');

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className="relative flex items-center"
                onClick={() => {
                    if (!isOpen) {
                        setIsOpen(true);
                        setSearchTerm(''); // Clear search to show full list on open
                    }
                }}
            >
                <div className="absolute left-3 text-muted-foreground">
                    <Search size={14} />
                </div>
                <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                    placeholder={!isOpen && selectedOption ? selectedOption.label : placeholder}
                    value={isOpen ? searchTerm : (selectedOption?.label || '')}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                    onKeyDown={handleKeyDown}
                />
                <div className="absolute right-3 text-muted-foreground pointer-events-none">
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 mt-1 max-h-[300px] overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No results found.</div>
                    ) : (
                        <div className="p-1">
                            {hasGroups ? (
                                Object.entries(groupedOptions).map(([group, groupOptions]) => (
                                    <div key={group}>
                                        <div className="px-2 py-1.5 text-sm font-bold text-foreground">
                                            {group}
                                        </div>
                                        {groupOptions.map(option => (
                                            <div
                                                key={option.value}
                                                className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${value === option.value ? 'bg-accent text-accent-foreground' : ''
                                                    } ${filteredOptions.indexOf(option) === selectedIndex ? 'bg-accent' : ''}`}
                                                onClick={() => {
                                                    onChange(option.value);
                                                    setIsOpen(false);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span>{option.label}</span>
                                                    {value === option.value && <Check size={14} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                filteredOptions.map(option => (
                                    <div
                                        key={option.value}
                                        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${value === option.value ? 'bg-accent text-accent-foreground' : ''
                                            } ${filteredOptions.indexOf(option) === selectedIndex ? 'bg-accent' : ''}`}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span>{option.label}</span>
                                            {value === option.value && <Check size={14} />}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
