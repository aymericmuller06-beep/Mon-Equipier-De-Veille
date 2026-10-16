import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'

export default function ValidatedArticles() {
  return (
    <VeilleLayout>
      <h1>Articles validés</h1>
      <p className="dashboard-subtitle">Votre base de connaissances : classez-la avec des tags et retrouvez-la avec la recherche.</p>
      <ArticleBoard statuses={['validated']} canAddManual />
    </VeilleLayout>
  )
}
