export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Three connected nodes forming a small triangle network */}
      <line x1="5" y1="6" x2="19" y2="6" stroke="var(--border-strong)" strokeWidth="1.2" />
      <line x1="5" y1="6" x2="12" y2="19" stroke="var(--border-strong)" strokeWidth="1.2" />
      <line x1="19" y1="6" x2="12" y2="19" stroke="var(--border-strong)" strokeWidth="1.2" />
      <circle cx="5" cy="6" r="2.5" fill="var(--accent)" />
      <circle cx="19" cy="6" r="2" fill="var(--cyan)" />
      <circle cx="12" cy="19" r="2.2" fill="var(--amber)" />
    </svg>
  );
}
