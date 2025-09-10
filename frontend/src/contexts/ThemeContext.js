import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/appConfig';

const ThemeContext = createContext();

// Fallback themes in case API is unavailable
export const fallbackThemes = {
  default: {
    id: 'default',
    name: 'Soft Ocean',
    description: 'Gentle ocean blues with calming elegance',
    colors: {
      primary: '#475569', // Muted slate blue
      secondary: '#F8FAFC', // Pure soft white
      accent: '#64748B', // Subtle slate accent
      background: '#FEFEFE', // Clean white
      foreground: '#1E293B',
      card: '#F8FAFC', // Soft card background
      'card-foreground': '#1E293B',
      muted: '#F1F5F9',
      'muted-foreground': '#64748B', // Gentle text
      border: '#E2E8F0', // Soft border
      input: '#F8FAFC',
      ring: '#475569'
    },
    darkColors: {
      primary: '#94A3B8', // Soft blue for dark
      secondary: '#1E293B',
      accent: '#CBD5E1', // Light accent for dark
      background: '#0F172A', // Deep navy background
      foreground: '#F8FAFC',
      card: '#1E293B', // Gentle dark card
      'card-foreground': '#F8FAFC',
      muted: '#334155',
      'muted-foreground': '#94A3B8',
      border: '#334155',
      input: '#1E293B',
      ring: '#94A3B8'
    }
  },
  warm: {
    id: 'warm',
    name: 'Soft Warmth',
    description: 'Gentle warm tones with subtle elegance',
    colors: {
      primary: '#78716C', // Muted warm brown
      secondary: '#FAFAF9', // Soft cream
      accent: '#6B7280', // Gentle gray accent
      background: '#FEFEFE', // Pure white
      foreground: '#292524',
      card: '#F9F9F8', // Soft warm card
      'card-foreground': '#292524',
      muted: '#F5F5F4', // Subtle muted
      'muted-foreground': '#57534E', // Soft brown text
      border: '#E7E5E4', // Gentle border
      input: '#FAFAF9',
      ring: '#78716C'
    },
    darkColors: {
      primary: '#A8A29E', // Soft brown for dark
      secondary: '#1C1917',
      accent: '#9CA3AF', // Gentle gray accent
      background: '#0A0A0A', // Deep background
      foreground: '#FAFAF9',
      card: '#1C1917', // Dark brown card
      'card-foreground': '#FAFAF9',
      muted: '#292524',
      'muted-foreground': '#A8A29E',
      border: '#292524',
      input: '#1C1917',
      ring: '#A8A29E'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Gentle Rose',
    description: 'Soft rose tones with subtle warmth',
    colors: {
      primary: '#9F1239', // Muted rose
      secondary: '#FDF2F8', // Soft pink white
      accent: '#BE185D', // Gentle pink accent
      background: '#FEFEFE', // Clean white
      foreground: '#1F2937',
      card: '#FDF2F8', // Soft rose card
      'card-foreground': '#1F2937',
      muted: '#FCE7F3', // Light pink muted
      'muted-foreground': '#6B7280', // Gentle text
      border: '#F9A8D4', // Soft pink border
      input: '#FDF2F8',
      ring: '#9F1239'
    },
    darkColors: {
      primary: '#F472B6', // Soft rose for dark
      secondary: '#1F2937',
      accent: '#EC4899', // Pink accent
      background: '#111827', // Deep background
      foreground: '#FDF2F8',
      card: '#1F2937', // Dark card
      'card-foreground': '#FDF2F8',
      muted: '#374151',
      'muted-foreground': '#F472B6',
      border: '#374151',
      input: '#1F2937',
      ring: '#F472B6'
    }
  },
  earth: {
    id: 'earth',
    name: 'Soft Sage',
    description: 'Calming sage greens with natural elegance',
    colors: {
      primary: '#6B7280', // Muted sage
      secondary: '#F9FAFB', // Soft white
      accent: '#84CC16', // Gentle green accent
      background: '#FEFEFE', // Pure white
      foreground: '#1F2937',
      card: '#F9FAFB', // Soft card
      'card-foreground': '#1F2937',
      muted: '#F3F4F6', // Light muted
      'muted-foreground': '#6B7280', // Gentle text
      border: '#E5E7EB', // Soft border
      input: '#F9FAFB',
      ring: '#6B7280'
    },
    darkColors: {
      primary: '#9CA3AF', // Soft sage for dark
      secondary: '#1F2937',
      accent: '#A3E635', // Green accent
      background: '#111827', // Deep background
      foreground: '#F9FAFB',
      card: '#1F2937', // Dark card
      'card-foreground': '#F9FAFB',
      muted: '#374151',
      'muted-foreground': '#9CA3AF',
      border: '#374151',
      input: '#1F2937',
      ring: '#9CA3AF'
    }
  },
  nature: {
    id: 'nature',
    name: 'Soft Mint',
    description: 'Gentle mint greens with subtle freshness',
    colors: {
      primary: '#6B7280', // Muted green-gray
      secondary: '#F0FDF4', // Soft mint white
      accent: '#22C55E', // Gentle green accent
      background: '#FEFEFE', // Clean white
      foreground: '#1F2937',
      card: '#F0FDF4', // Soft mint card
      'card-foreground': '#1F2937',
      muted: '#DCFCE7', // Light mint muted
      'muted-foreground': '#6B7280', // Gentle text
      border: '#BBF7D0', // Soft green border
      input: '#F0FDF4',
      ring: '#6B7280'
    },
    darkColors: {
      primary: '#9CA3AF', // Soft green-gray for dark
      secondary: '#1F2937',
      accent: '#4ADE80', // Green accent
      background: '#111827', // Deep background
      foreground: '#F0FDF4',
      card: '#1F2937', // Dark card
      'card-foreground': '#F0FDF4',
      muted: '#374151',
      'muted-foreground': '#9CA3AF',
      border: '#374151',
      input: '#1F2937',
      ring: '#9CA3AF'
    }
  },
  // NEW ELEGANT THEMES
  lavender: {
    id: 'lavender',
    name: 'Soft Lavender',
    description: 'Calming lavender with elegant purple tones',
    colors: {
      primary: '#7C3AED', // Muted purple
      secondary: '#FAF5FF', // Soft lavender white
      accent: '#A78BFA', // Light purple accent
      background: '#FEFEFE', // Pure white
      foreground: '#1F2937',
      card: '#FAF5FF', // Soft lavender card
      'card-foreground': '#1F2937',
      muted: '#F3E8FF', // Light purple muted
      'muted-foreground': '#6B7280', // Gentle text
      border: '#DDD6FE', // Soft purple border
      input: '#FAF5FF',
      ring: '#7C3AED'
    },
    darkColors: {
      primary: '#A78BFA', // Soft purple for dark
      secondary: '#1F2937',
      accent: '#C4B5FD', // Light purple accent
      background: '#111827', // Deep background
      foreground: '#FAF5FF',
      card: '#1F2937', // Dark card
      'card-foreground': '#FAF5FF',
      muted: '#374151',
      'muted-foreground': '#A78BFA',
      border: '#374151',
      input: '#1F2937',
      ring: '#A78BFA'
    }
  },
  cream: {
    id: 'cream',
    name: 'Elegant Cream',
    description: 'Sophisticated cream with warm undertones',
    colors: {
      primary: '#92400E', // Warm brown
      secondary: '#FFFBEB', // Soft cream
      accent: '#D97706', // Amber accent
      background: '#FEFEFE', // Pure white
      foreground: '#1F2937',
      card: '#FFFBEB', // Cream card
      'card-foreground': '#1F2937',
      muted: '#FEF3C7', // Light cream muted
      'muted-foreground': '#78716C', // Warm text
      border: '#FDE68A', // Soft yellow border
      input: '#FFFBEB',
      ring: '#92400E'
    },
    darkColors: {
      primary: '#F59E0B', // Warm amber for dark
      secondary: '#1F2937',
      accent: '#FBBF24', // Light amber accent
      background: '#111827', // Deep background
      foreground: '#FFFBEB',
      card: '#1F2937', // Dark card
      'card-foreground': '#FFFBEB',
      muted: '#374151',
      'muted-foreground': '#F59E0B',
      border: '#374151',
      input: '#1F2937',
      ring: '#F59E0B'
    }
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl Gray',
    description: 'Sophisticated pearl with subtle shimmer',
    colors: {
      primary: '#4B5563', // Sophisticated gray
      secondary: '#F9FAFB', // Pearl white
      accent: '#6366F1', // Subtle indigo accent
      background: '#FEFEFE', // Pure white
      foreground: '#1F2937',
      card: '#F9FAFB', // Pearl card
      'card-foreground': '#1F2937',
      muted: '#F3F4F6', // Light gray muted
      'muted-foreground': '#6B7280', // Medium text
      border: '#E5E7EB', // Soft border
      input: '#F9FAFB',
      ring: '#4B5563'
    },
    darkColors: {
      primary: '#9CA3AF', // Soft gray for dark
      secondary: '#1F2937',
      accent: '#818CF8', // Light indigo accent
      background: '#111827', // Deep background
      foreground: '#F9FAFB',
      card: '#1F2937', // Dark card
      'card-foreground': '#F9FAFB',
      muted: '#374151',
      'muted-foreground': '#9CA3AF',
      border: '#374151',
      input: '#1F2937',
      ring: '#9CA3AF'
    }
  },
  blush: {
    id: 'blush',
    name: 'Soft Blush',
    description: 'Delicate blush pink with gentle elegance',
    colors: {
      primary: '#BE185D', // Elegant pink
      secondary: '#FDF2F8', // Soft blush white
      accent: '#EC4899', // Rose accent
      background: '#FEFEFE', // Pure white
      foreground: '#1F2937',
      card: '#FDF2F8', // Blush card
      'card-foreground': '#1F2937',
      muted: '#FCE7F3', // Light pink muted
      'muted-foreground': '#78716C', // Soft text
      border: '#F9A8D4', // Gentle pink border
      input: '#FDF2F8',
      ring: '#BE185D'
    },
    darkColors: {
      primary: '#F472B6', // Soft pink for dark
      secondary: '#1F2937',
      accent: '#F9A8D4', // Light pink accent
      background: '#111827', // Deep background
      foreground: '#FDF2F8',
      card: '#1F2937', // Dark card
      'card-foreground': '#FDF2F8',
      muted: '#374151',
      'muted-foreground': '#F472B6',
      border: '#374151',
      input: '#1F2937',
      ring: '#F472B6'
    }
  },
  slate: {
    id: 'slate',
    name: 'Modern Slate',
    description: 'Clean slate tones with contemporary feel',
    colors: {
      primary: '#475569', // Modern slate
      secondary: '#F8FAFC', // Crisp white
      accent: '#0EA5E9', // Sky blue accent
      background: '#FEFEFE', // Pure white
      foreground: '#1E293B',
      card: '#F8FAFC', // Slate card
      'card-foreground': '#1E293B',
      muted: '#F1F5F9', // Light slate muted
      'muted-foreground': '#64748B', // Medium text
      border: '#E2E8F0', // Soft border
      input: '#F8FAFC',
      ring: '#475569'
    },
    darkColors: {
      primary: '#94A3B8', // Soft slate for dark
      secondary: '#1E293B',
      accent: '#38BDF8', // Light blue accent
      background: '#0F172A', // Deep slate background
      foreground: '#F8FAFC',
      card: '#1E293B', // Dark slate card
      'card-foreground': '#F8FAFC',
      muted: '#334155',
      'muted-foreground': '#94A3B8',
      border: '#334155',
      input: '#1E293B',
      ring: '#94A3B8'
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
  const [currentTheme, setCurrentTheme] = useState('default');
  const [themes, setThemes] = useState(fallbackThemes);
  const [loading, setLoading] = useState(true);
  const [apiThemes, setApiThemes] = useState([]);
  const darkMode = useSelector((state) => state.ui?.darkMode || false);

  useEffect(() => {
    fetchThemesFromAPI();
  }, []);

  useEffect(() => {
    if (!loading) {
      const savedTheme = localStorage.getItem('selectedTheme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    }
  }, [loading, themes]);

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
    localStorage.setItem('selectedTheme', themeId);
  };

  // Fetch themes from API
  const fetchThemesFromAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/api/themes`);
      if (response.ok) {
        const apiData = await response.json();
        console.log('🎨 Fetched themes from API:', apiData.length, 'themes');
        setApiThemes(apiData);
        
        // Convert API themes to our theme format
        const convertedThemes = {};
        apiData.forEach(theme => {
          convertedThemes[theme._id] = {
            id: theme._id,
            name: theme.name,
            description: theme.description,
            colors: generateColorsFromPrimary(theme.primaryColor, theme.secondaryColor),
            darkColors: generateDarkColorsFromPrimary(theme.primaryColor, theme.secondaryColor),
            isDefault: theme.isDefault
          };
        });
        
        // Merge with fallback themes, prioritizing API themes
        setThemes({ ...fallbackThemes, ...convertedThemes });
        
        // Set default theme if one exists in API
        const defaultTheme = apiData.find(theme => theme.isDefault);
        if (defaultTheme) {
          const savedTheme = localStorage.getItem('selectedTheme');
          if (!savedTheme) {
            setCurrentTheme(defaultTheme._id);
          }
        }
      } else {
        console.warn('Failed to fetch themes from API, using fallback themes');
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
      console.log('Using fallback themes due to API error');
    } finally {
      setLoading(false);
    }
  };

  // Generate colors from primary and secondary colors
  const generateColorsFromPrimary = (primary, secondary) => {
    return {
      primary: primary || '#475569',
      secondary: secondary || '#F8FAFC',
      accent: adjustColor(primary, -20) || '#64748B',
      background: secondary || '#FEFEFE',
      foreground: '#1E293B',
      card: secondary || '#F8FAFC',
      'card-foreground': '#1E293B',
      muted: adjustColor(secondary, -5) || '#F1F5F9',
      'muted-foreground': adjustColor(primary, 20) || '#64748B',
      border: adjustColor(secondary, -10) || '#E2E8F0',
      input: secondary || '#F8FAFC',
      ring: primary || '#475569'
    };
  };

  const generateDarkColorsFromPrimary = (primary, secondary) => {
    return {
      primary: adjustColor(primary, 40) || '#94A3B8',
      secondary: adjustColor(primary, -40) || '#1E293B',
      accent: adjustColor(primary, 60) || '#CBD5E1',
      background: '#0F172A',
      foreground: '#F8FAFC',
      card: adjustColor(primary, -30) || '#1E293B',
      'card-foreground': '#F8FAFC',
      muted: adjustColor(primary, -20) || '#334155',
      'muted-foreground': adjustColor(primary, 30) || '#94A3B8',
      border: adjustColor(primary, -25) || '#334155',
      input: adjustColor(primary, -30) || '#1E293B',
      ring: adjustColor(primary, 40) || '#94A3B8'
    };
  };

  // Helper function to adjust color brightness
  const adjustColor = (color, percent) => {
    if (!color) return null;
    try {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    } catch {
      return color;
    }
  };


  // Apply theme whenever current theme or dark mode changes
  useEffect(() => {
    if (!loading && themes[currentTheme]) {
      applyTheme(currentTheme, darkMode);
    }
  }, [currentTheme, darkMode, loading, themes]);

  const value = {
    currentTheme,
    themes,
    apiThemes,
    loading,
    switchTheme: (themeId) => {
      if (themes[themeId]) {
        setCurrentTheme(themeId);
        localStorage.setItem('selectedTheme', themeId);
      }
    },
    darkMode,
    fetchThemesFromAPI,
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
