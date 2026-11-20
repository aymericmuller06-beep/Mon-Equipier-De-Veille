// Logo RSS standard (carré orange arrondi, point et deux ondes en blanc)
export default function RssLogo({ size = 16, className = '' }) {
  return (
    <svg className={`rss-logo ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="10" fill="#F26522" />
      <circle cx="14" cy="34" r="4" fill="#FFFFFF" />
      <path d="M10 22a16 16 0 0 1 16 16" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      <path d="M10 11a27 27 0 0 1 27 27" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
