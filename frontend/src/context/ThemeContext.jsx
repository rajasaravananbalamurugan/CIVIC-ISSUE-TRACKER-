import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'dark',  label: 'Dark',  icon: '🌙', desc: 'Classic dark mode' },
  { id: 'light', label: 'Light', icon: '☀️', desc: 'Clean & bright' },
  { id: 'ocean', label: 'Ocean', icon: '🌊', desc: 'Deep blue waters' },
  { id: 'neon',  label: 'Neon',  icon: '⚡', desc: 'Cyberpunk glow' },
];

export const THEME_PALETTES = {
  dark:  ['#0f1729', '#2563eb', '#14b8a6'],
  light: ['#f1f5f9', '#2563eb', '#0d9488'],
  ocean: ['#040d1a', '#0ea5e9', '#06b6d4'],
  neon:  ['#05080f', '#818cf8', '#34d399'],
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('civic-theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('civic-theme', theme); } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES, THEME_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
