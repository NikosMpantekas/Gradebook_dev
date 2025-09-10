import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const ThemeContext = createContext();

// Define our 5 color themes with muted, readable colors (light and dark variants)
export const themes = {
  default: {
    id: 'default',
    name: 'Ocean Blue',
    description: 'Classic blue theme',
    colors: {
      primary: '#2563EB',
      secondary: '#F1F5F9',
      accent: '#3B82F6',
      background: '#FFFFFF',
      foreground: '#0F172A',
      card: '#FAFAFA',
      'card-foreground': '#0F172A',
      muted: '#F1F5F9',
      'muted-foreground': '#64748B',
      border: '#E2E8F0',
      input: '#F8FAFC',
      ring: '#2563EB'
    },
    darkColors: {
      primary: '#3B82F6',
      secondary: '#1E293B',
      accent: '#60A5FA',
      background: '#0F172A',
      foreground: '#F8FAFC',
      card: '#1E293B',
      'card-foreground': '#F8FAFC',
      muted: '#334155',
      'muted-foreground': '#94A3B8',
      border: '#334155',
      input: '#1E293B',
      ring: '#3B82F6'
    }
  },
  warm: {
    id: 'warm',
    name: 'Warm Sand',
    description: 'Cozy warm tones',
    colors: {
      primary: '#047857',
      secondary: '#FEF3E2',
      accent: '#059669',
      background: '#FFFBF7',
      foreground: '#1C2917',
      card: '#FDF8F3',
      'card-foreground': '#1C2917',
      muted: '#FEF3E2',
      'muted-foreground': '#78716C',
      border: '#E7E5E4',
      input: '#FAF5F0',
      ring: '#047857'
    },
    darkColors: {
      primary: '#10B981',
      secondary: '#292524',
      accent: '#34D399',
      background: '#1C1917',
      foreground: '#FEF3E2',
      card: '#292524',
      'card-foreground': '#FEF3E2',
      muted: '#44403C',
      'muted-foreground': '#A8A29E',
      border: '#44403C',
      input: '#292524',
      ring: '#10B981'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Vibrant sunset colors',
    colors: {
      primary: '#DC2626',
      secondary: '#FEF3C7',
      accent: '#EA580C',
      background: '#FFFEF7',
      foreground: '#1C1917',
      card: '#FDF9F0',
      'card-foreground': '#1C1917',
      muted: '#FEF3C7',
      'muted-foreground': '#A3A3A3',
      border: '#E5E7EB',
      input: '#FBF7ED',
      ring: '#DC2626'
    },
    darkColors: {
      primary: '#F87171',
      secondary: '#451A03',
      accent: '#FB923C',
      background: '#1C1917',
      foreground: '#FEF3C7',
      card: '#451A03',
      'card-foreground': '#FEF3C7',
      muted: '#78716C',
      'muted-foreground': '#D6D3D1',
      border: '#78716C',
      input: '#451A03',
      ring: '#F87171'
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth Tones',
    description: 'Natural earth colors',
    colors: {
      primary: '#374151',
      secondary: '#F3F4F6',
      accent: '#4B5563',
      background: '#FAFAFA',
      foreground: '#111827',
      card: '#F9FAFB',
      'card-foreground': '#111827',
      muted: '#F3F4F6',
      'muted-foreground': '#6B7280',
      border: '#E5E7EB',
      input: '#F9FAFB',
      ring: '#374151'
    },
    darkColors: {
      primary: '#9CA3AF',
      secondary: '#1F2937',
      accent: '#6B7280',
      background: '#111827',
      foreground: '#F9FAFB',
      card: '#1F2937',
      'card-foreground': '#F9FAFB',
      muted: '#374151',
      'muted-foreground': '#D1D5DB',
      border: '#374151',
      input: '#1F2937',
      ring: '#9CA3AF'
    }
  },
  nature: {
    id: 'nature',
    name: 'Fresh Nature',
    description: 'Vibrant green theme',
    colors: {
      primary: '#16A34A',
      secondary: '#F0FDF4',
      accent: '#22C55E',
      background: '#FEFFFE',
      foreground: '#14532D',
      card: '#F7FEF7',
      'card-foreground': '#14532D',
      muted: '#F0FDF4',
      'muted-foreground': '#65A30D',
      border: '#DCFCE7',
      input: '#F0FDF4',
      ring: '#16A34A'
    },
    darkColors: {
      primary: '#4ADE80',
      secondary: '#14532D',
      accent: '#22C55E',
      background: '#0F172A',
      foreground: '#F0FDF4',
      card: '#14532D',
      'card-foreground': '#F0FDF4',
      muted: '#166534',
      'muted-foreground': '#BBF7D0',
      border: '#166534',
      input: '#14532D',
      ring: '#4ADE80'
    }
  }
};

// Convert hex to HSL for CSS custom properties
function hexToHsl(hex) {
  const r = parseInt(hex.substr(1, 2), 16) / 255;
  const g = parseInt(hex.substr(3, 2), 16) / 255;
  const b = parseInt(hex.substr(5, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const ThemeProvider = ({ children }) => {
  const { darkMode } = useSelector((state) => state.ui);
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load theme from localStorage or default to 'default'
    const saved = localStorage.getItem('gradebook-theme');
    return saved && themes[saved] ? saved : 'default';
  });

  const applyTheme = (themeId, isDark = false) => {
    const theme = themes[themeId];
    if (!theme) return;

    const root = document.documentElement;
    
    // Choose light or dark colors based on dark mode
    const colors = isDark ? theme.darkColors || theme.colors : theme.colors;
    
    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace('_', '-')}`;
      root.style.setProperty(cssVar, hexToHsl(value));
    });

    // Apply destructive colors (keep consistent)
    root.style.setProperty('--destructive', '0 84% 60%');
    root.style.setProperty('--destructive-foreground', '0 0% 98%');

    // Apply border radius
    root.style.setProperty('--radius', '0.5rem');

    // Apply theme to body background for full coverage
    document.body.style.backgroundColor = `hsl(${hexToHsl(colors.background)})`;
    document.body.style.color = `hsl(${hexToHsl(colors.foreground)})`;
    
    // Apply to html element as well for full coverage
    document.documentElement.style.backgroundColor = `hsl(${hexToHsl(colors.background)})`;
    document.documentElement.style.color = `hsl(${hexToHsl(colors.foreground)})`;

    // Ensure dark class is properly set for shadcn components
    root.classList.toggle('dark', Boolean(isDark));

    // Save to localStorage
    localStorage.setItem('gradebook-theme', themeId);
    setCurrentTheme(themeId);
  };

  const switchTheme = (themeId) => {
    if (themes[themeId]) {
      applyTheme(themeId, darkMode);
    }
  };

  // Apply theme whenever current theme or dark mode changes
  useEffect(() => {
    applyTheme(currentTheme, darkMode);
  }, [currentTheme, darkMode]);

  const value = {
    currentTheme,
    themes,
    switchTheme,
    darkMode,
    getCurrentThemeData: () => themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
