// Tickets grisés affichés pendant le chargement : la page garde sa forme au lieu d'un simple texte
export default function TicketSkeletons({ count = 4, label = 'Chargement des articles…' }) {
  return (
    <div className="ticket-list" role="status">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="ticket ticket--skeleton" aria-hidden="true">
          <div className="ticket-main">
            <span className="skeleton-line skeleton-line--meta" />
            <span className="skeleton-line skeleton-line--title" />
            <span className="skeleton-line skeleton-line--tags" />
          </div>
          <div className="ticket-side">
            <span className="skeleton-line skeleton-line--button" />
          </div>
        </div>
      ))}
    </div>
  )
}
