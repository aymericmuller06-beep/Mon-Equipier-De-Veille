import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../Context/useTheme';
import { useWatch } from '../Context/WatchContext';
import { Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export const ThemeToggle = () => {
  const { accentColor, changeAccentColor, accentColors } = useTheme();
  const { watchTitle, deleteWatch } = useWatch();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await deleteWatch(watchTitle);
    setIsConfirmOpen(false);
    navigate('/');
  };

  return (
    <div className="theme-toggle">
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

      {/* Suppression de la veille */}
      <div className="theme-toggle__danger" role="group" aria-label="Zone de danger">
        <span className="theme-toggle__label">Zone de danger</span>
        <button
          type="button"
          className="theme-toggle__delete"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!watchTitle}
        >
          <Trash2 aria-hidden="true" />
          Supprimer cette veille
        </button>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer cette veille"
        message={`Supprimer définitivement la veille "${watchTitle}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
};
