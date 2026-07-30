export function ElectricMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative block h-5 w-7 text-accent ${className}`}>
      <span className="absolute left-0 top-1 h-0.5 w-4 -rotate-12 bg-current" />
      <span className="absolute bottom-1 right-0 h-0.5 w-4 -rotate-12 bg-current" />
    </span>
  );
}
