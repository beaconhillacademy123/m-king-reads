export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logoMark">
      <defs>
        <linearGradient id="mkrGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d58b" /><stop offset="1" stopColor="#c8912f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#12131c" />
      <path d="M14 24l9 7 9-13 9 13 9-7-4 18H18z" fill="url(#mkrGold)" />
      <path d="M17 46h30c0 0-4 4-15 4s-15-4-15-4z" fill="url(#mkrGold)" opacity=".85" />
    </svg>
  );
}
