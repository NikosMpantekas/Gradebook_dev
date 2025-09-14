import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/appConfig';

const ThemeContext = createContext();

// Fallback themes in case API is unavailable
export const fallbackThemes = {
  default: {
    id: 'default',
    name: 'Ocean Breeze',
    description: 'Refreshing ocean blues with modern elegance',
    colors: {
      primary: '#0EA5E9', // Bright sky blue
      secondary: '#F0F9FF', // Very soft blue white
      accent: '#38BDF8', // Light sky blue accent
      background: '#FEFEFE', // Clean white
      foreground: '#0F172A',
      card: '#F8FAFC', // Soft card background
      'card-foreground': '#0F172A',
      muted: '#F1F5F9',
      'muted-foreground': '#64748B', // Gentle text
      border: '#E2E8F0', // Soft border
      input: '#F8FAFC',
      ring: '#0EA5E9'
    },
    darkColors: {
      primary: '#38BDF8', // Bright blue for dark
      secondary: '#1E293B',
      accent: '#7DD3FC', // Light blue accent
      background: '#1A202C', // Soft dark gray-blue background
      foreground: '#F8FAFC',
      card: '#1E293B', // Dark card
      'card-foreground': '#F8FAFC',
      muted: '#334155',
      'muted-foreground': '#94A3B8',
      border: '#334155',
      input: '#1E293B',
      ring: '#38BDF8'
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
    name: 'Sunset Rose',
    description: 'Warm rose tones inspired by golden sunset',
    colors: {
      primary: '#DC2626', // True rose red
      secondary: '#FEF2F2', // Soft rose white
      accent: '#F97316', // Sunset orange accent
      background: '#FEFEFE', // Clean white
      foreground: '#1F2937',
      card: '#FEF2F2', // Soft rose card
      'card-foreground': '#1F2937',
      muted: '#FEE2E2', // Light rose muted
      'muted-foreground': '#991B1B', // Rose text
      border: '#FECACA', // Soft rose border
      input: '#FEF2F2',
      ring: '#DC2626'
    },
    darkColors: {
      primary: '#F87171', // Soft rose for dark
      secondary: '#1F1917',
      accent: '#FB923C', // Warm orange accent
      background: '#0F0A0A', // Deep rose background
      foreground: '#FEF2F2',
      card: '#1F1917', // Dark rose card
      'card-foreground': '#FEF2F2',
      muted: '#2D1B1B',
      'muted-foreground': '#F87171',
      border: '#2D1B1B',
      input: '#1F1917',
      ring: '#F87171'
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth Sage',
    description: 'Natural sage greens with earthy warmth',
    colors: {
      primary: '#16A34A', // True sage green
      secondary: '#F0FDF4', // Soft sage white
      accent: '#65A30D', // Natural green accent
      background: '#FEFEFE', // Clean white
      foreground: '#14532D',
      card: '#F0FDF4', // Soft sage card
      'card-foreground': '#14532D',
      muted: '#DCFCE7', // Light sage muted
      'muted-foreground': '#166534', // Sage text
      border: '#BBF7D0', // Soft sage border
      input: '#F0FDF4',
      ring: '#16A34A'
    },
    darkColors: {
      primary: '#4ADE80', // Bright sage for dark
      secondary: '#0F1B0F',
      accent: '#84CC16', // Lime accent
      background: '#0A0F0A', // Deep earth background
      foreground: '#F0FDF4',
      card: '#0F1B0F', // Dark earth card
      'card-foreground': '#F0FDF4',
      muted: '#1B2F1B',
      'muted-foreground': '#4ADE80',
      border: '#1B2F1B',
      input: '#0F1B0F',
      ring: '#4ADE80'
    }
  },
  nature: {
    id: 'nature',
    name: 'Fresh Mint',
    description: 'Refreshing mint greens with crisp freshness',
    colors: {
      primary: '#059669', // True mint green
      secondary: '#ECFDF5', // Fresh mint white
      accent: '#10B981', // Emerald accent
      background: '#FEFEFE', // Clean white
      foreground: '#064E3B',
      card: '#ECFDF5', // Fresh mint card
      'card-foreground': '#064E3B',
      muted: '#D1FAE5', // Light mint muted
      'muted-foreground': '#047857', // Mint text
      border: '#A7F3D0', // Soft mint border
      input: '#ECFDF5',
      ring: '#059669'
    },
    darkColors: {
      primary: '#34D399', // Bright mint for dark
      secondary: '#0F1B17',
      accent: '#6EE7B7', // Light mint accent
      background: '#0A1512', // Deep mint background
      foreground: '#ECFDF5',
      card: '#0F1B17', // Dark mint card
      'card-foreground': '#ECFDF5',
      muted: '#1B2F23',
      'muted-foreground': '#34D399',
      border: '#1B2F23',
      input: '#0F1B17',
      ring: '#34D399'
    }
  },
  // NEW ELEGANT THEMES
  lavender: {
    id: 'lavender',
    name: 'Elegant Lavender',
    description: 'Sophisticated lavender with rich purple harmony',
    colors: {
      primary: '#8B5CF6', // True lavender purple
      secondary: '#FAF5FF', // Soft lavender white
      accent: '#A855F7', // Rich purple accent
      background: '#FEFEFE', // Pure white
      foreground: '#581C87',
      card: '#FAF5FF', // Soft lavender card
      'card-foreground': '#581C87',
      muted: '#F3E8FF', // Light lavender muted
      'muted-foreground': '#7C2D92', // Lavender text
      border: '#DDD6FE', // Soft lavender border
      input: '#FAF5FF',
      ring: '#8B5CF6'
    },
    darkColors: {
      primary: '#C4B5FD', // Soft lavender for dark
      secondary: '#1C1B2F',
      accent: '#DDD6FE', // Light lavender accent
      background: '#0F0A1B', // Deep lavender background
      foreground: '#FAF5FF',
      card: '#1C1B2F', // Dark lavender card
      'card-foreground': '#FAF5FF',
      muted: '#2D1B3D',
      'muted-foreground': '#C4B5FD',
      border: '#2D1B3D',
      input: '#1C1B2F',
      ring: '#C4B5FD'
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
    name: 'Pearl Elegance',
    description: 'Sophisticated pearl gray with silver shimmer',
    colors: {
      primary: '#6B7280', // Pearl gray
      secondary: '#F8FAFC', // Lustrous pearl white
      accent: '#94A3B8', // Silver accent
      background: '#FEFEFE', // Pure white
      foreground: '#374151',
      card: '#F8FAFC', // Pearl card
      'card-foreground': '#374151',
      muted: '#F1F5F9', // Light pearl muted
      'muted-foreground': '#475569', // Pearl text
      border: '#E2E8F0', // Soft pearl border
      input: '#F8FAFC',
      ring: '#6B7280'
    },
    darkColors: {
      primary: '#CBD5E1', // Bright pearl for dark
      secondary: '#1E293B',
      accent: '#F1F5F9', // Light pearl accent
      background: '#0F172A', // Deep pearl background
      foreground: '#F8FAFC',
      card: '#1E293B', // Dark pearl card
      'card-foreground': '#F8FAFC',
      muted: '#334155',
      'muted-foreground': '#CBD5E1',
      border: '#334155',
      input: '#1E293B',
      ring: '#CBD5E1'
    }
  },
  blush: {
    id: 'blush',
    name: 'Cherry Blush',
    description: 'Delicate cherry blossom pink with soft elegance',
    colors: {
      primary: '#EC4899', // Cherry blossom pink
      secondary: '#FDF2F8', // Soft cherry white
      accent: '#F472B6', // Bright pink accent
      background: '#FEFEFE', // Pure white
      foreground: '#831843',
      card: '#FDF2F8', // Cherry card
      'card-foreground': '#831843',
      muted: '#FCE7F3', // Light cherry muted
      'muted-foreground': '#9D174D', // Cherry text
      border: '#FBCFE8', // Soft cherry border
      input: '#FDF2F8',
      ring: '#EC4899'
    },
    darkColors: {
      primary: '#F9A8D4', // Soft cherry for dark
      secondary: '#2F1B29',
      accent: '#FBCFE8', // Light cherry accent
      background: '#1A0F17', // Deep cherry background
      foreground: '#FDF2F8',
      card: '#2F1B29', // Dark cherry card
      'card-foreground': '#FDF2F8',
      muted: '#3D1B2E',
      'muted-foreground': '#F9A8D4',
      border: '#3D1B2E',
      input: '#2F1B29',
      ring: '#F9A8D4'
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
    // Only fetch themes if user is authenticated
    const getUserFromStorage = () => {
      try {
        const sessionUser = sessionStorage.getItem('user');
        const localUser = localStorage.getItem('user');
        const userStr = sessionUser || localUser;
        return userStr ? JSON.parse(userStr) : null;
      } catch {
        return null;
      }
    };
    
    const user = getUserFromStorage();
    if (user && user.token) {
      console.log('🎨 User authenticated, fetching themes from API');
      fetchThemesFromAPI();
    } else {
      console.log('🎨 No authenticated user, using fallback themes for public pages');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      const savedTheme = localStorage.getItem('selectedTheme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    }
  }, [loading, themes]);
  
  // Apply theme-specific notification colors
  const applyThemeSpecificNotificationColors = (themeId, colors, isDark, root) => {
    // Define notification colors based on theme identity
    const notificationConfigs = {
      sunset: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 92% 62%' : '38 92% 50%', 
        info: isDark ? '14 86% 62%' : '14 86% 42%',    // Rose-tinted info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      blush: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 92% 62%' : '38 92% 50%',
        info: isDark ? '328 86% 70%' : '328 86% 50%',   // Pink-tinted info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      earth: {
        success: isDark ? '142 76% 73%' : '142 70% 49%', // Natural green
        warning: isDark ? '45 93% 58%' : '45 93% 47%',   // Earth yellow
        info: isDark ? '142 50% 65%' : '142 50% 40%',    // Sage info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      nature: {
        success: isDark ? '158 76% 73%' : '158 70% 49%', // Mint green
        warning: isDark ? '45 93% 58%' : '45 93% 47%',
        info: isDark ? '158 60% 65%' : '158 60% 40%',    // Mint info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      lavender: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 92% 62%' : '38 92% 50%',
        info: isDark ? '271 76% 73%' : '271 70% 49%',    // Purple info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      cream: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 95% 69%' : '38 92% 50%',   // Cream warning
        info: isDark ? '38 70% 62%' : '38 70% 42%',      // Warm info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      pearl: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 92% 62%' : '38 92% 50%',
        info: isDark ? '215 25% 75%' : '215 25% 45%',    // Pearl gray info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      },
      warm: {
        success: isDark ? '142 69% 58%' : '142 69% 45%',
        warning: isDark ? '38 95% 69%' : '38 92% 50%',
        info: isDark ? '25 60% 65%' : '25 60% 40%',      // Warm brown info
        error: isDark ? '0 84% 70%' : '0 84% 55%'
      }
    };
    
    // Get theme-specific colors or fall back to defaults
    const themeNotifications = notificationConfigs[themeId] || {
      success: isDark ? '142 76% 73%' : '142 70% 49%',
      warning: isDark ? '38 95% 69%' : '38 92% 50%',
      info: isDark ? '217 91% 73%' : '217 91% 60%',
      error: isDark ? '0 93% 73%' : '0 84% 60%'
    };
    
    // Apply the notification colors
    root.style.setProperty('--success', themeNotifications.success);
    root.style.setProperty('--success-foreground', isDark ? '142 10% 15%' : '355 20% 98%');
    root.style.setProperty('--warning', themeNotifications.warning);
    root.style.setProperty('--warning-foreground', isDark ? '20 14% 4%' : '0 0% 0%');
    root.style.setProperty('--info', themeNotifications.info);
    root.style.setProperty('--info-foreground', isDark ? '222 84% 5%' : '0 0% 98%');
    root.style.setProperty('--error', themeNotifications.error);
    root.style.setProperty('--error-foreground', isDark ? '0 13% 6%' : '0 0% 98%');
  };

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
    
    // Apply theme-specific notification colors based on theme type
    applyThemeSpecificNotificationColors(themeId, colors, isDark, root);

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
