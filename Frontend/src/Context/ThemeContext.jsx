import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWatch } from './useWatch';
import { ThemeContext } from './useTheme';

const accentPalette = {
  red: { color: '#ef4444', light: '#fee2e2', dark: '#7f1d1d' },
  orange: { color: '#f97316', light: '#ffedd5', dark: '#7c2d12' },
  yellow: { color: '#f59e0b', light: '#fef3c7', dark: '#78350f' },
  green: { color: '#22c55e', light: '#dcfce7', dark: '#145231' },
  blue: { color: '#0ea5e9', light: '#e0f2fe', dark: '#0c3d66' },
  indigo: { color: '#6366f1', light: '#e0e7ff', dark: '#312e81' },
  violet: { color: '#a855f7', light: '#f3e8ff', dark: '#581c87' },
};

export const ThemeProvider = ({ children }) => {
  const { currentWatch, setWatchAccent } = useWatch();
  const { pathname } = useLocation();

  // Mode light/dark
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR guard
    const saved = localStorage.getItem('theme-mode');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Le hub reste vert. L'accent propre à une veille ne s'applique que dans son espace.
  const accentColor = pathname.startsWith('/veille') && currentWatch
    ? currentWatch.accent_color || 'green'
    : 'green';
  const accentColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

  // Appliquer le mode dark au body
  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR guard
    
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Appliquer la couleur d'accent
  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR guard
    
    const accent = accentPalette[accentColor] ?? accentPalette.green;
    document.documentElement.style.setProperty('--accent-color', accent.color);
    document.documentElement.style.setProperty('--accent-light', accent.light);
    document.documentElement.style.setProperty('--accent-dark', accent.dark);
  }, [accentColor]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  const changeAccentColor = (color) => {
    if (!accentColors.includes(color) || !currentWatch) return;
    setWatchAccent(currentWatch.id, color).catch((err) => {
      console.error("Impossible d'enregistrer la couleur d'accent :", err.message);
    });
  };

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggleDarkMode,
      accentColor,
      changeAccentColor,
      accentColors,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
