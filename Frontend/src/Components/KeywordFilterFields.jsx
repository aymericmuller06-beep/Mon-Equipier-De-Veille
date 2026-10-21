// Champs « doit contenir » / « ne doit pas contenir » d'une source (mots-clés séparés par des virgules)
export default function KeywordFilterFields({ include, exclude, onIncludeChange, onExcludeChange, idPrefix }) {
  return (
    <>
      <label htmlFor={`${idPrefix}-include`}>
        Garder seulement si ça parle de <span className="tool-modal-optional">(facultatif)</span>
      </label>
      <input
        id={`${idPrefix}-include`}
        type="text"
        placeholder="Ex. : IA, cybersécurité, ransomware"
        value={include}
        onChange={(event) => onIncludeChange(event.target.value)}
        maxLength={500}
      />

      <label htmlFor={`${idPrefix}-exclude`}>
        Écarter si ça parle de <span className="tool-modal-optional">(facultatif)</span>
      </label>
      <input
        id={`${idPrefix}-exclude`}
        type="text"
        placeholder="Ex. : live, short, sponsorisé"
        value={exclude}
        onChange={(event) => onExcludeChange(event.target.value)}
        maxLength={500}
      />
      <p className="tool-modal-note">
        Séparez les mots par des virgules. Le titre et la description sont vérifiés, sans tenir compte des majuscules ni des accents.
      </p>
    </>
  )
}
