export const COURSES = [
    { id: 'MBA', name: 'MBA' },
    { id: 'MCA', name: 'MCA' },
    { id: 'MCOM', name: 'M.COM' },
    { id: 'BBA', name: 'BBA' },
    { id: 'BCA', name: 'BCA' },
    { id: 'BCOMH', name: 'B.COM (HONS)' },
    { id: 'BAMASS', name: 'B.A.HONS (MASS COMMUNICATION)' },
];

export const courseDisplayName = (courseId) => {
    const course = COURSES.find(c => c.id === courseId);
    return course ? course.name : courseId;
};

// ============================================================
// ROLL NUMBER PATTERNS
// Format: [PREFIX][YYIN 2 digits][YYOUT 2 digits][NNN 3 digits]
// Example: BCA2326077  → BCA, entered 2023, passes 2026, roll 077
// ============================================================
const ROLL_PREFIX_TO_COURSE = {
    'MCOM': 'MCOM',
    'BAMC': 'BAMASS',
    'MBA': 'MBA',
    'MCA': 'MCA',
    'BBA': 'BBA',
    'BCA': 'BCA',
    'BCOM': 'BCOMH',
    'BA': 'BAMASS',
};

// Sort prefixes by length descending
const prefixes = Object.keys(ROLL_PREFIX_TO_COURSE).sort((a, b) => b.length - a.length);

export const detectCourse = (rollNumber) => {
    if (!rollNumber) return null;
    const upper = rollNumber.trim().toUpperCase();

    for (const prefix of prefixes) {
        if (upper.startsWith(prefix)) {
            const remainder = upper.substring(prefix.length);
            // Validate: remaining must be exactly 7 digits
            if (remainder.length === 7 && /^\d{7}$/.test(remainder)) {
                return ROLL_PREFIX_TO_COURSE[prefix];
            }
        }
    }
    return null;
};

export const extractEntranceYear = (rollNumber) => {
    if (!rollNumber) return null;
    const upper = rollNumber.trim().toUpperCase();

    for (const prefix of prefixes) {
        if (upper.startsWith(prefix)) {
            const remainder = upper.substring(prefix.length);
            if (remainder.length === 7 && /^\d{7}$/.test(remainder)) {
                return 2000 + parseInt(remainder.substring(0, 2), 10);
            }
        }
    }
    return null;
};

export const extractPassOutYear = (rollNumber) => {
    if (!rollNumber) return null;
    const upper = rollNumber.trim().toUpperCase();

    for (const prefix of prefixes) {
        if (upper.startsWith(prefix)) {
            const remainder = upper.substring(prefix.length);
            if (remainder.length === 7 && /^\d{7}$/.test(remainder)) {
                return 2000 + parseInt(remainder.substring(2, 4), 10);
            }
        }
    }
    return null;
};
