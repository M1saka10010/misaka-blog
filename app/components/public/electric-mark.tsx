export function ElectricMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`electric-mark relative block h-5 w-7 text-accent ${className}`}>
      <svg viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <path className="electric-mark-line" d="M2.5 5.5h9l-3.5 5" />
        <path className="electric-mark-line" d="M25.5 14.5h-9l3.5-5" />
      </svg>
    </span>
  );
}
