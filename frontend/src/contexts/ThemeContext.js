import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/appConfig';

const ThemeContext = createContext();

// Fallback themes in case API is unavailable
export const fallbackThemes = {
  default: {
    id: 'default',
    name: 'Ocean Breeze',
    description: 'Muted ocean tones with quiet elegance',
    colors: {
      primary: '#8AADC0',
      secondary: '#F2F6F9',
      accent: '#9BBDCC',
      background: '#FEFEFE',
      foreground: '#2C3640',
      card: '#FFFFFF',
      'card-foreground': '#2C3640',
      muted: '#EEF2F6',
      'muted-foreground': '#6B7A88',
      border: '#D6DEE6',
      input: '#F8FAFC',
      ring: '#8AADC0'
    },
    darkColors: {
      primary: '#9BBDCC',
      secondary: '#1C2228',
      accent: '#B0CDD8',
      background: '#161B22',
      foreground: '#E0E8F0',
      card: '#1C2228',
      'card-foreground': '#E0E8F0',
      muted: '#2A3038',
      'muted-foreground': '#8A9BB0',
      border: '#3A4450',
      input: '#1C2228',
      ring: '#9BBDCC'
    }
  },
  warm: {
    id: 'warm',
    name: 'Warm Espresso',
    description: 'Muted warm tones with quiet comfort',
    colors: {
      primary: '#B89E8C',
      secondary: '#F8F5F2',
      accent: '#C4AE9C',
      background: '#FEFEFE',
      foreground: '#3A3430',
      card: '#FFFFFF',
      'card-foreground': '#3A3430',
      muted: '#F2EDEA',
      'muted-foreground': '#7A7068',
      border: '#DDD8D4',
      input: '#FAFAF9',
      ring: '#B89E8C'
    },
    darkColors: {
      primary: '#C4AE9C',
      secondary: '#242120',
      accent: '#D0BEB0',
      background: '#1A1918',
      foreground: '#EDE6E0',
      card: '#242120',
      'card-foreground': '#EDE6E0',
      muted: '#3A3634',
      'muted-foreground': '#B0A498',
      border: '#4A4644',
      input: '#242120',
      ring: '#C4AE9C'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Rose',
    description: 'Muted rose tones with quiet warmth',
    colors: {
      primary: '#C09590',
      secondary: '#F8F4F3',
      accent: '#C8A8A0',
      background: '#FEFEFE',
      foreground: '#3D3230',
      card: '#FFFFFF',
      'card-foreground': '#3D3230',
      muted: '#F5EDEB',
      'muted-foreground': '#806862',
      border: '#E4D4D0',
      input: '#FEF2F2',
      ring: '#C09590'
    },
    darkColors: {
      primary: '#CCA8A2',
      secondary: '#241E1E',
      accent: '#D4B8B0',
      background: '#1A1616',
      foreground: '#F0E6E4',
      card: '#241E1E',
      'card-foreground': '#F0E6E4',
      muted: '#382E2E',
      'muted-foreground': '#C0A8A2',
      border: '#4A3E3E',
      input: '#241E1E',
      ring: '#CCA8A2'
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth Sage',
    description: 'Muted sage tones with natural calm',
    colors: {
      primary: '#8CAA90',
      secondary: '#F4F7F5',
      accent: '#9CB4A0',
      background: '#FEFEFE',
      foreground: '#303D34',
      card: '#FFFFFF',
      'card-foreground': '#303D34',
      muted: '#EAF0EC',
      'muted-foreground': '#5A7060',
      border: '#C8D8CC',
      input: '#F0FDF4',
      ring: '#8CAA90'
    },
    darkColors: {
      primary: '#9CB8A0',
      secondary: '#1C221C',
      accent: '#B0C8B0',
      background: '#161A16',
      foreground: '#E4F0E8',
      card: '#1C221C',
      'card-foreground': '#E4F0E8',
      muted: '#2E382E',
      'muted-foreground': '#98B8A0',
      border: '#3E4C3E',
      input: '#1C221C',
      ring: '#9CB8A0'
    }
  },
  nature: {
    id: 'nature',
    name: 'Fresh Mint',
    description: 'Muted mint tones with soft freshness',
    colors: {
      primary: '#82AEA4',
      secondary: '#F2F7F6',
      accent: '#94BAB0',
      background: '#FEFEFE',
      foreground: '#2D3D38',
      card: '#FFFFFF',
      'card-foreground': '#2D3D38',
      muted: '#E8F0ED',
      'muted-foreground': '#5A7A72',
      border: '#C4D8D0',
      input: '#ECFDF5',
      ring: '#82AEA4'
    },
    darkColors: {
      primary: '#94BAB0',
      secondary: '#1A2220',
      accent: '#A8C8C0',
      background: '#141A18',
      foreground: '#E0F0EC',
      card: '#1A2220',
      'card-foreground': '#E0F0EC',
      muted: '#2A3834',
      'muted-foreground': '#90B8AC',
      border: '#384A44',
      input: '#1A2220',
      ring: '#94BAB0'
    }
  },
  lavender: {
    id: 'lavender',
    name: 'Elegant Lavender',
    description: 'Muted lavender with quiet sophistication',
    colors: {
      primary: '#A098B8',
      secondary: '#F6F4F9',
      accent: '#AEA8C4',
      background: '#FEFEFE',
      foreground: '#35303D',
      card: '#FFFFFF',
      'card-foreground': '#35303D',
      muted: '#F0ECF5',
      'muted-foreground': '#706888',
      border: '#D4D0E0',
      input: '#FAF5FF',
      ring: '#A098B8'
    },
    darkColors: {
      primary: '#AEA8C8',
      secondary: '#201E26',
      accent: '#C0B8D4',
      background: '#18161E',
      foreground: '#ECE8F4',
      card: '#201E26',
      'card-foreground': '#ECE8F4',
      muted: '#322E3C',
      'muted-foreground': '#B0A8C4',
      border: '#443E50',
      input: '#201E26',
      ring: '#AEA8C8'
    }
  },
  cream: {
    id: 'cream',
    name: 'Elegant Cream',
    description: 'Muted cream with gentle warmth',
    colors: {
      primary: '#BCA88C',
      secondary: '#F8F6F2',
      accent: '#C4B09C',
      background: '#FEFEFE',
      foreground: '#3A3430',
      card: '#FFFFFF',
      'card-foreground': '#3A3430',
      muted: '#F4EEE6',
      'muted-foreground': '#7A6E5C',
      border: '#E0D8CC',
      input: '#FFFBEB',
      ring: '#BCA88C'
    },
    darkColors: {
      primary: '#C4B09C',
      secondary: '#22201C',
      accent: '#D0C0AC',
      background: '#1A1816',
      foreground: '#F0E8DC',
      card: '#22201C',
      'card-foreground': '#F0E8DC',
      muted: '#363230',
      'muted-foreground': '#C0B098',
      border: '#4A4640',
      input: '#22201C',
      ring: '#C4B09C'
    }
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl Silver',
    description: 'Muted silver with quiet refinement',
    colors: {
      primary: '#8E94AC',
      secondary: '#F5F6F8',
      accent: '#9CA2B8',
      background: '#FEFEFE',
      foreground: '#30333D',
      card: '#FFFFFF',
      'card-foreground': '#30333D',
      muted: '#EDEEF3',
      'muted-foreground': '#666C80',
      border: '#D0D3DC',
      input: '#F8FAFC',
      ring: '#8E94AC'
    },
    darkColors: {
      primary: '#9CA2B8',
      secondary: '#1E2024',
      accent: '#ACB2C4',
      background: '#151820',
      foreground: '#E4E6F0',
      card: '#1E2024',
      'card-foreground': '#E4E6F0',
      muted: '#2E3038',
      'muted-foreground': '#8E98B0',
      border: '#3E4248',
      input: '#1E2024',
      ring: '#9CA2B8'
    }
  },
  blush: {
    id: 'blush',
    name: 'Cherry Blush',
    description: 'Muted blossom pink with soft calm',
    colors: {
      primary: '#B8909C',
      secondary: '#F8F4F6',
      accent: '#C4A0AC',
      background: '#FEFEFE',
      foreground: '#3A3035',
      card: '#FFFFFF',
      'card-foreground': '#3A3035',
      muted: '#F4ECF0',
      'muted-foreground': '#7A6068',
      border: '#E0CCD4',
      input: '#FDF2F8',
      ring: '#B8909C'
    },
    darkColors: {
      primary: '#C4A0AC',
      secondary: '#241C20',
      accent: '#D0B0BC',
      background: '#1A1418',
      foreground: '#F0E6EC',
      card: '#241C20',
      'card-foreground': '#F0E6EC',
      muted: '#382E34',
      'muted-foreground': '#C0A0B0',
      border: '#4A3E44',
      input: '#241C20',
      ring: '#C4A0AC'
    }
  },
  flat: {
    id: 'flat',
    name: 'Flat Graphite',
    description: 'Clean monochrome grays — zero color, all business',
    colors: {
      primary: '#737373',
      secondary: '#F5F5F5',
      accent: '#A3A3A3',
      background: '#FEFEFE',
      foreground: '#262626',
      card: '#FFFFFF',
      'card-foreground': '#262626',
      muted: '#F5F5F5',
      'muted-foreground': '#737373',
      border: '#D4D4D4',
      input: '#FAFAFA',
      ring: '#737373'
    },
    darkColors: {
      primary: '#A3A3A3',
      secondary: '#262626',
      accent: '#D4D4D4',
      background: '#171717',
      foreground: '#F5F5F5',
      card: '#262626',
      'card-foreground': '#F5F5F5',
      muted: '#404040',
      'muted-foreground': '#A3A3A3',
      border: '#525252',
      input: '#262626',
      ring: '#A3A3A3'
    }
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum readability — black, white & yellow',
    colors: {
      primary: '#CA8A04',
      secondary: '#F5F5F5',
      accent: '#EAB308',
      background: '#FFFFFF',
      foreground: '#000000',
      card: '#FFFFFF',
      'card-foreground': '#000000',
      muted: '#F5F5F5',
      'muted-foreground': '#171717',
      border: '#000000',
      input: '#FFFFFF',
      ring: '#CA8A04'
    },
    darkColors: {
      primary: '#FACC15',
      secondary: '#171717',
      accent: '#EAB308',
      background: '#000000',
      foreground: '#FFFFFF',
      card: '#0A0A0A',
      'card-foreground': '#FFFFFF',
      muted: '#171717',
      'muted-foreground': '#E5E5E5',
      border: '#FFFFFF',
      input: '#0A0A0A',
      ring: '#FACC15'
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
      console.log('🎨 No authenticated user, applying public page CSS with dark mode support');
      applyPublicPageCSS(darkMode);
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
      },
      'high-contrast': {
        success: isDark ? '142 80% 60%' : '142 76% 36%',
        warning: isDark ? '48 96% 65%' : '48 96% 45%',
        info: isDark ? '48 96% 65%' : '48 96% 40%',
        error: isDark ? '0 90% 65%' : '0 84% 50%'
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

    // Toggle high-contrast class for CSS overrides
    root.classList.toggle('theme-high-contrast', themeId === 'high-contrast');

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


  // Apply independent dark/light mode colors for public pages
  const applyPublicPageCSS = (isDark = false) => {
    const root = document.documentElement;

    // Define independent public page colors (not user theme colors)
    const publicColors = {
      light: {
        background: '#FFFFFF',
        foreground: '#1F2937',
        card: '#F9FAFB',
        'card-foreground': '#1F2937',
        muted: '#F3F4F6',
        'muted-foreground': '#6B7280',
        border: '#E5E7EB',
        primary: '#2563EB', // Blue for public pages
        'primary-foreground': '#FFFFFF',
        secondary: '#F1F5F9',
        'secondary-foreground': '#0F172A'
      },
      dark: {
        background: '#111827',
        foreground: '#F9FAFB',
        card: '#1F2937',
        'card-foreground': '#F9FAFB',
        muted: '#374151',
        'muted-foreground': '#9CA3AF',
        border: '#4B5563',
        primary: '#3B82F6', // Lighter blue for dark mode
        'primary-foreground': '#FFFFFF',
        secondary: '#374151',
        'secondary-foreground': '#F9FAFB'
      }
    };

    const colors = isDark ? publicColors.dark : publicColors.light;

    // Apply the public page colors
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace('_', '-')}`;
      const hslValue = hexToHsl(value);
      root.style.setProperty(cssVar, hslValue);
    });

    // Apply to body and html for full coverage
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.foreground;
    document.documentElement.style.backgroundColor = colors.background;
    document.documentElement.style.color = colors.foreground;

    // Set dark class appropriately
    root.classList.toggle('dark', Boolean(isDark));

    console.log(`🎨 Applied ${isDark ? 'dark' : 'light'} mode CSS for public pages`);
  };

  // Apply theme whenever current theme or dark mode changes
  useEffect(() => {
    // Only apply themes if user is authenticated
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

    if (!loading && themes[currentTheme] && user && user.token) {
      console.log('🎨 Applying theme for authenticated user:', currentTheme);
      applyTheme(currentTheme, darkMode);
    } else if (!user || !user.token) {
      console.log('🎨 No authenticated user, applying public page CSS with dark mode:', darkMode);
      applyPublicPageCSS(darkMode);
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
    applyPublicPageCSS, // Expose this method for logout handling
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
