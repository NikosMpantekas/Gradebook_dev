import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// Define our 5 color themes with proper contrast ratios
export const themes = {
  default: {
    id: 'default',
    name: 'Ocean Blue',
    description: 'Classic blue theme',
    colors: {
      primary: '#3577B8', // Original primary color
      secondary: '#F1F5F9',
      accent: '#6366F1',
      background: '#FFFFFF',
      foreground: '#0F172A',
      card: '#FFFFFF',
      'card-foreground': '#0F172A',
      muted: '#F1F5F9',
      'muted-foreground': '#64748B',
      border: '#E2E8F0',
      input: '#E2E8F0',
      ring: '#3577B8'
    }
  },
  warm: {
    id: 'warm',
    name: 'Warm Sand',
    description: 'Cozy warm tones',
    colors: {
      primary: '#618A7F', // Teal green from your pair
      secondary: '#F3DDC2', // Light peachy from your pair
      accent: '#7C9885',
      background: '#FEFCF8',
      foreground: '#2D3748',
      card: '#F8F6F1',
      'card-foreground': '#2D3748',
      muted: '#F3DDC2',
      'muted-foreground': '#4A5568',
      border: '#E8DCC6',
      input: '#E8DCC6',
      ring: '#618A7F'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Vibrant sunset colors',
    colors: {
      primary: '#F88363', // Coral from your pair
      secondary: '#FAEFCA', // Light yellow from your pair
      accent: '#FF9A7B',
      background: '#FFFEF7',
      foreground: '#2D1B15',
      card: '#FDF8F0',
      'card-foreground': '#2D1B15',
      muted: '#FAEFCA',
      'muted-foreground': '#8B4513',
      border: '#F0E4C1',
      input: '#F0E4C1',
      ring: '#F88363'
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth Tones',
    description: 'Natural earth colors',
    colors: {
      primary: '#5B5850', // Dark brown from your pair
      secondary: '#C2C0AA', // Light beige from your pair
      accent: '#6B6B5D',
      background: '#FDFDF9',
      foreground: '#2A2922',
      card: '#F9F9F4',
      'card-foreground': '#2A2922',
      muted: '#C2C0AA',
      'muted-foreground': '#4A4A42',
      border: '#B5B39E',
      input: '#B5B39E',
      ring: '#5B5850'
    }
  },
  nature: {
    id: 'nature',
    name: 'Fresh Nature',
    description: 'Vibrant green theme',
    colors: {
      primary: '#568203', // Green from your pair
      secondary: '#FFF8B9', // Light yellow from your pair
      accent: '#6B9A0A',
      background: '#FEFFFE',
      foreground: '#1A2E05',
      card: '#FBFFF5',
      'card-foreground': '#1A2E05',
      muted: '#FFF8B9',
      'muted-foreground': '#4A5D15',
      border: '#F0F5A8',
      input: '#F0F5A8',
      ring: '#568203'
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
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load theme from localStorage or default to 'default'
    const saved = localStorage.getItem('gradebook-theme');
    return saved && themes[saved] ? saved : 'default';
  });

  const applyTheme = (themeId) => {
    const theme = themes[themeId];
    if (!theme) return;

    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace('_', '-')}`;
      root.style.setProperty(cssVar, hexToHsl(value));
    });

    // Apply destructive colors (keep consistent)
    root.style.setProperty('--destructive', '0 84% 60%');
    root.style.setProperty('--destructive-foreground', '0 0% 98%');

    // Apply border radius
    root.style.setProperty('--radius', '0.5rem');

    // Save to localStorage
    localStorage.setItem('gradebook-theme', themeId);
    setCurrentTheme(themeId);
  };

  const switchTheme = (themeId) => {
    if (themes[themeId]) {
      applyTheme(themeId);
    }
  };

  // Apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  const value = {
    currentTheme,
    themes,
    switchTheme,
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
