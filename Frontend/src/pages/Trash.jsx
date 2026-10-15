import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'

export default function Trash() {
  return (
    <VeilleLayout>
      <h1>Corbeille</h1>
      <p className="dashboard-subtitle">Articles refusés. Restaurez-les à tout moment, ou videz la corbeille pour les supprimer définitivement.</p>
      <ArticleBoard statuses={['trash']} />
    </VeilleLayout>
  )
}
