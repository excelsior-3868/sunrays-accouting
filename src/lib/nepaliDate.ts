import NepaliDate from 'nepali-date-converter';

// Map of Nepali month names
const NEPAL_MONTHS = [
    "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

const NEPAL_MONTHS_BS = [
    "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
];

/**
 * Convert AD Date object or string to Nepali Date string (YYYY-MM-DD)
 */
export function toNepali(adDate: string | Date | null | undefined): string {
    if (!adDate) return '';
    try {
        const date = new Date(adDate);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY-MM-DD');
    } catch (e) {
        console.error("Error converting to Nepali date:", e);
        return '';
    }
}

/**
 * Convert Nepali Date string (YYYY-MM-DD) to AD Date object
 */
export function toEnglish(bsDateStr: string): Date | null {
    if (!bsDateStr) return null;
    try {
        // nepali-date-converter expects (YYYY, MM, DD) constructor or string
        // but string parsing can be tricky depending on separators.
        // It supports 'YYYY-MM-DD' format.
        const bsDate = new NepaliDate(bsDateStr);
        return bsDate.toJsDate();
    } catch (e) {
        console.error("Error converting to English date:", e);
        return null;
    }
}

/**
 * Format Nepali Date for display
 * e.g. "2081-01-15" -> "15 Baisakh, 2081"
 */
export function formatNepaliDate(bsDateStr: string, language: 'en' | 'np' = 'en'): string {
    if (!bsDateStr) return '';
    try {
        const bsDate = new NepaliDate(bsDateStr);
        const year = bsDate.getYear();
        const month = bsDate.getMonth(); // 0-11
        const day = bsDate.getDate();

        if (language === 'np') {
            return `${day} ${NEPAL_MONTHS_BS[month]}, ${year}`;
        }
        return `${day} ${NEPAL_MONTHS[month]}, ${year}`;
    } catch (e) {
        return bsDateStr;
    }
}

/**
 * Get Nepali Fiscal Year from AD Date
 * Fiscal Year starts from Shrawan 1st (approx mid-July)
 * Returns string like "2080/81"
 */
export function getNepaliFiscalYear(adDate: string | Date): string {
    if (!adDate) return '';
    try {
        const bsDate = new NepaliDate(new Date(adDate));
        const year = bsDate.getYear();
        const month = bsDate.getMonth(); // 0-index, 0 = Baisakh, 3 = Shrawan

        // If month is Shrawan (3) or later, it's the start of a new FY
        // If month is Baisakh (0) to Ashadh (2), it's the end of current FY

        // Actually, in Nepal FY is written as CurrentYear/NextYear
        // Example: If today is 2081 Baisakh (early 2081), it is FY 2080/81
        // If today is 2081 Shrawan (late 2081), it is FY 2081/82

        if (month < 3) { // Baisakh, Jestha, Ashadh
            return `${year - 1}/${(year % 100)}`;
        } else { // Shrawan onwards
            return `${year}/${(year + 1) % 100}`;
        }
    } catch (e) {
        return '';
    }
}

/**
 * Get start and end dates (AD) for a given Nepali Fiscal Year
 * fyString format: "2080/81"
 */
export function getFiscalYearDates(fyString: string): { start: Date, end: Date } | null {
    try {
        const parts = fyString.split('/');
        if (parts.length !== 2) return null;

        const startYear = parseInt(parts[0]);
        // Start: 1st Shrawan of startYear
        // Month index 3 = Shrawan
        const startBs = new NepaliDate(startYear, 3, 1);

        // End: 31st or 32nd Ashadh of next year
        // Easier calculation: 1st Shrawan of next year minus 1 day
        const endBsYear = startYear + 1;
        const nextYearStartBs = new NepaliDate(endBsYear, 3, 1);
        const endAd = new Date(nextYearStartBs.toJsDate());
        endAd.setDate(endAd.getDate() - 1); // Subtract 1 day

        return {
            start: startBs.toJsDate(),
            end: endAd
        };
    } catch (e) {
        console.error("Error calculating FY dates:", e);
        return null;
    }
}
