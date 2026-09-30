import { useTheme } from '../Context/useTheme';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { isDark, toggleDarkMode, accentColor, changeAccentColor, accentColors } = useTheme();

  return (
    <div className="theme-toggle">
      {/* Dark/Light Mode Toggle */}
      <div className="theme-toggle__mode">
        <button
          className={`theme-toggle__btn ${isDark ? 'active' : ''}`}
          onClick={toggleDarkMode}
          title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark ? <Sun /> : <Moon />}
        </button>
      </div>

      {/* Accent Color Selector */}
      <div className="theme-toggle__accent">
        {accentColors.map((color) => (
          <button
            key={color}
            className={`theme-toggle__color theme-toggle__color--${color} ${
              accentColor === color ? 'active' : ''
            }`}
            onClick={() => changeAccentColor(color)}
            title={`Accent: ${color}`}
          />
        ))}
      </div>
    </div>
  );
};
