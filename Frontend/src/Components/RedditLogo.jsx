// Logo Reddit simplifié (rond orange et tête de l'alien en blanc)
export default function RedditLogo({ size = 16, className = '' }) {
  return (
    <svg className={`reddit-logo ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" fill="#FF4500" />
      <g fill="#FFFFFF">
        <circle cx="33.5" cy="10.5" r="3" />
        <path d="M24.6 15.5 26.5 9l6 1.4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13.5" cy="23" r="3.6" />
        <circle cx="34.5" cy="23" r="3.6" />
        <ellipse cx="24" cy="28" rx="12.5" ry="9" />
      </g>
      <circle cx="19" cy="26.5" r="2.1" fill="#FF4500" />
      <circle cx="29" cy="26.5" r="2.1" fill="#FF4500" />
      <path d="M19.5 31.5c2.6 1.8 6.4 1.8 9 0" fill="none" stroke="#FF4500" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
