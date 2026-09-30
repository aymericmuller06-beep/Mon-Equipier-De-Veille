import { useTheme } from '../Context/useTheme';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { isDark, toggleDarkMode, accentColor, changeAccentColor, accentColors } = useTheme();

  return (
    <div className="theme-toggle">
      {/* Dark/Light Mode Toggle */}
      <div className="theme-toggle__mode" role="group" aria-label="Thème général du site">
        <span className="theme-toggle__label">Thème général</span>
        <button
          type="button"
          className={`theme-toggle__btn ${isDark ? 'active' : ''}`}
          onClick={toggleDarkMode}
          title={isDark ? 'Mode clair' : 'Mode sombre'}
          aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        >
          {isDark ? <Sun /> : <Moon />}
        </button>
      </div>

      {/* Accent Color Selector */}
      <div className="theme-toggle__accent" role="group" aria-label="Couleur d’accent de cette veille">
        <span className="theme-toggle__label">Couleur de cette veille</span>
        <div className="theme-toggle__swatches">
          {accentColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`theme-toggle__color theme-toggle__color--${color} ${
                accentColor === color ? 'active' : ''
              }`}
              onClick={() => changeAccentColor(color)}
              title={`Accent ${color}`}
              aria-label={`Choisir la couleur ${color}`}
              aria-pressed={accentColor === color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
