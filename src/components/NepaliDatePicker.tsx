import { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toNepali, toEnglish } from '@/lib/nepaliDate';

interface NepaliDatePickerProps {
    value?: string | Date | null; // AD Date string or object
    onChange: (adDate: string) => void;
    placeholder?: string;
    className?: string;
}

const NEPAL_MONTHS_BS = [
    "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
];

export default function NepaliDatePicker({ value, onChange, placeholder = "Select Date", className }: NepaliDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial value or default to today
    const initialAd = value ? new Date(value) : new Date();
    // Validate date
    const safeAd = isNaN(initialAd.getTime()) ? new Date() : initialAd;

    const [selectedBs, setSelectedBs] = useState<NepaliDate>(new NepaliDate(safeAd));
    const [viewBs, setViewBs] = useState<NepaliDate>(new NepaliDate(safeAd)); // For navigation

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const newBs = new NepaliDate(date);
                setSelectedBs(newBs);
                setViewBs(newBs); // Sync view when value changes externally
            }
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateSelect = (day: number) => {
        const newBs = new NepaliDate(viewBs.getYear(), viewBs.getMonth(), day);
        setSelectedBs(newBs);
        const adDate = newBs.toJsDate();
        // Return YYYY-MM-DD format (AD)
        const adString = adDate.toISOString().split('T')[0];
        onChange(adString);
        setIsOpen(false);
    };

    const changeMonth = (offset: number) => {
        const currentMonth = viewBs.getMonth();
        const currentYear = viewBs.getYear();

        let newMonth = currentMonth + offset;
        let newYear = currentYear;

        if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        }

        // Default to day 1 to avoid rollover issues
        setViewBs(new NepaliDate(newYear, newMonth, 1));
    };

    const changeYear = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(event.target.value);
        setViewBs(new NepaliDate(newYear, viewBs.getMonth(), 1));
    };

    const changeMonthSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = parseInt(event.target.value);
        setViewBs(new NepaliDate(viewBs.getYear(), newMonth, 1));
    };

    // Calculate days in month
    // NepaliDate doesn't strictly expose getDaysInMonth, so we infer
    const getDaysInMonth = (year: number, month: number) => {
        // Try day 32, if it rolls over to month+1, then it has < 32 days
        // This logic depends on the library implementation. 
        // A safer way often used with this library is utilizing known maps or trial.
        // Let's rely on standard BS map provided by library if available, else trial.
        // nepali-date-converter handles overflow correctly.
        for (let d = 32; d >= 29; d--) {
            const check = new NepaliDate(year, month, d);
            if (check.getMonth() === month) return d;
        }
        return 30; // Fallback
    };

    const daysInMonth = getDaysInMonth(viewBs.getYear(), viewBs.getMonth());
    const startWeekDay = new NepaliDate(viewBs.getYear(), viewBs.getMonth(), 1).getDay(); // 0 = Sunday

    const years = [];
    const currentYear = new NepaliDate().getYear();
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
        years.push(i);
    }

    const displayValue = value ? toNepali(value) : '';

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background cursor-pointer",
                    !value && "text-muted-foreground"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                {displayValue || placeholder}
                <CalendarIcon className="h-4 w-4 opacity-50" />
            </div>

            {isOpen && (
                <div className="absolute top-10 z-50 w-64 rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 bg-white">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => changeMonth(-1)} type="button" className="p-1 hover:bg-muted rounded text-black">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1">
                            <select
                                value={viewBs.getMonth()}
                                onChange={changeMonthSelect}
                                className="h-7 text-xs rounded border bg-transparent p-1 font-medium text-black"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {NEPAL_MONTHS_BS.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={viewBs.getYear()}
                                onChange={changeYear}
                                className="h-7 text-xs rounded border bg-transparent p-1 font-medium text-black"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={() => changeMonth(1)} type="button" className="p-1 hover:bg-muted rounded text-black">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-xs mb-1">
                        {['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'].map((d) => (
                            <div key={d} className="font-medium text-muted-foreground py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 text-center text-sm gap-y-1">
                        {Array.from({ length: startWeekDay }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isSelected =
                                selectedBs.getYear() === viewBs.getYear() &&
                                selectedBs.getMonth() === viewBs.getMonth() &&
                                selectedBs.getDate() === day;

                            const isToday =
                                new NepaliDate().getYear() === viewBs.getYear() &&
                                new NepaliDate().getMonth() === viewBs.getMonth() &&
                                new NepaliDate().getDate() === day;

                            return (
                                <div
                                    key={day}
                                    className={cn(
                                        "h-7 w-7 flex items-center justify-center rounded cursor-pointer text-black hover:bg-muted font-normal text-[0.8rem]",
                                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                        !isSelected && isToday && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => handleDateSelect(day)}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
