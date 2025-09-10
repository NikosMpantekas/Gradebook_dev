import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const ThemeContext = createContext();

// Define our 5 premium color themes with sophisticated palettes and gradients
export const themes = {
  default: {
    id: 'default',
    name: 'Ocean Elegance',
    description: 'Sophisticated deep ocean blues with premium feel',
    colors: {
      primary: '#1E40AF', // Rich royal blue
      secondary: '#F8FAFF', // Softer blue-white
      accent: '#3B82F6', // Vibrant accent blue
      background: '#FDFDFF', // Ultra-subtle blue tint
      foreground: '#0F172A',
      card: '#F9FAFB', // Premium card background
      'card-foreground': '#0F172A',
      muted: '#F1F5F9',
      'muted-foreground': '#475569', // Deeper muted text
      border: '#E1E7EF', // Subtle blue-gray border
      input: '#F8FAFC',
      ring: '#1E40AF'
    },
    darkColors: {
      primary: '#60A5FA', // Luminous blue for dark
      secondary: '#1E293B',
      accent: '#93C5FD', // Lighter accent for dark
      background: '#020617', // Deep navy background
      foreground: '#F1F5F9',
      card: '#0F1629', // Rich dark card
      'card-foreground': '#F1F5F9',
      muted: '#1E293B',
      'muted-foreground': '#94A3B8',
      border: '#1E293B',
      input: '#0F1629',
      ring: '#60A5FA'
    }
  },
  warm: {
    id: 'warm',
    name: 'Golden Warmth',
    description: 'Luxurious warm golden tones with emerald accents',
    colors: {
      primary: '#B45309', // Rich amber gold
      secondary: '#FEF9F3', // Cream white
      accent: '#0891B2', // Sophisticated teal accent
      background: '#FFFCF5', // Warm ivory
      foreground: '#1C1917',
      card: '#FEF7ED', // Soft warm card
      'card-foreground': '#1C1917',
      muted: '#F3E8D3', // Golden muted
      'muted-foreground': '#57534E', // Warm brown text
      border: '#E7D4B5', // Golden border
      input: '#FEF3E2',
      ring: '#B45309'
    },
    darkColors: {
      primary: '#FBBF24', // Bright gold for dark
      secondary: '#1C1917',
      accent: '#06B6D4', // Cyan accent for contrast
      background: '#0C0A09', // Deep brown-black
      foreground: '#FEF7ED',
      card: '#1C1917', // Rich dark brown
      'card-foreground': '#FEF7ED',
      muted: '#292524',
      'muted-foreground': '#A8A29E',
      border: '#292524',
      input: '#1C1917',
      ring: '#FBBF24'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Radiance',
    description: 'Mesmerizing sunset gradients with coral elegance',
    colors: {
      primary: '#EA580C', // Vibrant sunset orange
      secondary: '#FFF7ED', // Soft peach white
      accent: '#F472B6', // Pink accent for warmth
      background: '#FFFBF7', // Warm off-white
      foreground: '#1C1917',
      card: '#FEF3E2', // Warm peach card
      'card-foreground': '#1C1917',
      muted: '#FED7AA', // Soft orange muted
      'muted-foreground': '#92400E', // Deep orange text
      border: '#FDBA74', // Warm orange border
      input: '#FFF7ED',
      ring: '#EA580C'
    },
    darkColors: {
      primary: '#FB923C', // Bright sunset for dark
      secondary: '#1C1917',
      accent: '#EC4899', // Vibrant pink accent
      background: '#0A0A0A', // Deep charcoal
      foreground: '#FFF7ED',
      card: '#1F1611', // Dark warm brown
      'card-foreground': '#FFF7ED',
      muted: '#292017',
      'muted-foreground': '#FDBA74',
      border: '#292017',
      input: '#1F1611',
      ring: '#FB923C'
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth Sophistication',
    description: 'Refined natural tones with sage and terracotta',
    colors: {
      primary: '#15803D', // Rich forest green
      secondary: '#F7F9F7', // Soft sage white
      accent: '#A855F7', // Purple accent for sophistication
      background: '#FEFFFE', // Natural white
      foreground: '#1F2937',
      card: '#F3F7F3', // Sage card background
      'card-foreground': '#1F2937',
      muted: '#E8F1E8', // Soft green muted
      'muted-foreground': '#4B5563', // Natural gray text
      border: '#D4E4D4', // Gentle green border
      input: '#F7F9F7',
      ring: '#15803D'
    },
    darkColors: {
      primary: '#22C55E', // Vibrant green for dark
      secondary: '#1F2937',
      accent: '#C084FC', // Light purple accent
      background: '#0F1419', // Deep forest background
      foreground: '#F7F9F7',
      card: '#1A2B1A', // Dark forest card
      'card-foreground': '#F7F9F7',
      muted: '#1F2B1F',
      'muted-foreground': '#86EFAC',
      border: '#1F2B1F',
      input: '#1A2B1A',
      ring: '#22C55E'
    }
  },
  nature: {
    id: 'nature',
    name: 'Verdant Luxury',
    description: 'Premium botanical greens with gold highlights',
    colors: {
      primary: '#059669', // Deep emerald
      secondary: '#F0FDF9', // Mint white
      accent: '#F59E0B', // Gold accent for luxury
      background: '#FDFFFE', // Pure white with green tint
      foreground: '#064E3B',
      card: '#ECFDF5', // Soft mint card
      'card-foreground': '#064E3B',
      muted: '#D1FAE5', // Light emerald muted
      'muted-foreground': '#047857', // Deep green text
      border: '#A7F3D0', // Elegant mint border
      input: '#F0FDF9',
      ring: '#059669'
    },
    darkColors: {
      primary: '#34D399', // Bright emerald for dark
      secondary: '#064E3B',
      accent: '#FBBF24', // Bright gold accent
      background: '#022C22', // Deep forest background
      foreground: '#ECFDF5',
      card: '#064E3B', // Rich emerald card
      'card-foreground': '#ECFDF5',
      muted: '#0F5132',
      'muted-foreground': '#6EE7B7',
      border: '#0F5132',
      input: '#064E3B',
      ring: '#34D399'
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
