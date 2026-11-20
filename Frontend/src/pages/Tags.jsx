import VeilleLayout from '../Components/VeilleLayout'
import TagManager from '../Components/TagManager'

export default function Tags() {
  return (
    <VeilleLayout>
      <h1>Tags</h1>
      <p className="dashboard-subtitle">
        Les tags sont communs à toutes vos veilles. Renommez-en un avec le nom d’un tag existant pour fusionner les deux.
        Cliquez sur un nombre d’articles pour les retrouver.
      </p>
      <TagManager />
    </VeilleLayout>
  )
}
