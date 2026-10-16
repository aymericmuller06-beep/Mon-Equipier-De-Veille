import { PenLine } from 'lucide-react'
import GoogleLogo from './GoogleLogo'
import GoogleNewsLogo from './GoogleNewsLogo'
import YouTubeLogo from './YouTubeLogo'

// Icône d'un type d'outil (tool_type d'une source)
export default function ToolIcon({ type, size = 16, className = '' }) {
  switch (type) {
    case 'google_alerts':
      return <GoogleLogo size={size} className={className} />
    case 'google_news':
      return <GoogleNewsLogo size={size} className={className} />
    case 'youtube':
      return <YouTubeLogo size={size} className={className} />
    case 'manual':
      return <PenLine size={size} className={`tool-icon ${className}`} aria-hidden="true" />
    default:
      return null
  }
}
