/** Brand mark: Composio-style gradient tile with a keyhole (OAuth access). Same art as src/app/icon.svg. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ee39a" />
          <stop offset="0.5" stopColor="#4fb8c4" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#logo-g)" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#141414" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M32 14c-6.1 0-11 4.9-11 11 0 4.1 2.2 7.6 5.5 9.5L24 50h16l-2.5-15.5C40.8 32.6 43 29.1 43 25c0-6.1-4.9-11-11-11z" fill="#141414" />
    </svg>
  );
}
