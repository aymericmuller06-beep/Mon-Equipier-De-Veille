import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'

export default function NewArticles() {
  return (
    <VeilleLayout>
      <h1>Nouveaux articles</h1>
      <p className="dashboard-subtitle">Articles collectés par vos outils, en attente de tri. Ajoutez une note pour garder la raison de votre choix.</p>
      <ArticleBoard statuses={['new']} canAddManual />
    </VeilleLayout>
  )
}
