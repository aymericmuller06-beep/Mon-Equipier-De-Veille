// Logo YouTube (rectangle rouge et triangle blanc)
export default function YouTubeLogo({ size = 16, className = '' }) {
  return (
    <svg className={`youtube-logo ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FF0000" d="M45 14.2a5.6 5.6 0 0 0-3.9-4C37.6 9.3 24 9.3 24 9.3s-13.6 0-17.1.9a5.6 5.6 0 0 0-3.9 4C2.1 17.7 2.1 24 2.1 24s0 6.3.9 9.8a5.6 5.6 0 0 0 3.9 4c3.5.9 17.1.9 17.1.9s13.6 0 17.1-.9a5.6 5.6 0 0 0 3.9-4c.9-3.5.9-9.8.9-9.8s0-6.3-.9-9.8z" />
      <path fill="#FFFFFF" d="M19.6 30.7 31 24l-11.4-6.7z" />
    </svg>
  )
}
