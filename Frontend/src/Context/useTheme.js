import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé avec ThemeProvider');
  }
  return context;
};
