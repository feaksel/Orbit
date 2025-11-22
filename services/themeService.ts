
export type ThemeId = 'emerald' | 'violet' | 'blue' | 'rose' | 'amber' | 'slate';

interface ThemePalette {
    name: string;
    colors: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    };
}

// Helper to convert hex to RGB values for CSS variables
const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
};

export const THEMES: Record<ThemeId, ThemePalette> = {
    emerald: {
        name: 'Orbit Green',
        colors: {
            50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
            400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
            800: '#065f46', 900: '#064e3b', 950: '#022c22'
        }
    },
    violet: {
        name: 'Nebula Purple',
        colors: {
            50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
            400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
            800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065'
        }
    },
    blue: {
        name: 'Ocean Blue',
        colors: {
            50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
            400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
            800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
        }
    },
    rose: {
        name: 'Crimson Rose',
        colors: {
            50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
            400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
            800: '#9f1239', 900: '#881337', 950: '#4c0519'
        }
    },
    amber: {
        name: 'Solar Flare',
        colors: {
            50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
            400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
            800: '#92400e', 900: '#78350f', 950: '#451a03'
        }
    },
    slate: {
        name: 'Midnight',
        colors: {
            50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
            400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
            800: '#1e293b', 900: '#0f172a', 950: '#020617'
        }
    }
};

const STORAGE_KEY_THEME = 'orbit_theme_v1';

export const getStoredTheme = (): ThemeId => {
    return (localStorage.getItem(STORAGE_KEY_THEME) as ThemeId) || 'emerald';
};

export const applyTheme = (themeId: ThemeId) => {
    const theme = THEMES[themeId] || THEMES.emerald;
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(([shade, hex]) => {
        root.style.setProperty(`--orbit-${shade}`, hexToRgb(hex));
    });

    localStorage.setItem(STORAGE_KEY_THEME, themeId);
};
