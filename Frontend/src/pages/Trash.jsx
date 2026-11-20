import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'

export default function Trash() {
  return (
    <VeilleLayout>
      <h1>Corbeille</h1>
      <p className="dashboard-subtitle">Articles refusés. Chacun indique quand il sera supprimé automatiquement : restaurez-le avant si besoin, ou videz la corbeille pour tout supprimer tout de suite.</p>
      <ArticleBoard statuses={['trash']} />
    </VeilleLayout>
  )
}
