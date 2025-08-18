import React, { createContext, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const { darkMode } = useSelector((state) => state.ui);

  useEffect(() => {
    const root = document.documentElement;
    // Only toggle the dark class; do not modify any CSS variables.
    root.classList.toggle('dark', Boolean(darkMode));
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
