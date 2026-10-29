type BrandLogoProps = { className?: string; markOnly?: boolean };

export function RookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" fill="none" className={className} aria-hidden="true">
      <path d="M24 14h20v14h12V14h16v14h12V14h20v30L92 56l8 44H28l8-44-12-12V14Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" />
      <path d="M36 56h56M28 100h72l10 16H18l10-16Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" />
      <path d="M47 84c8-13 17-17 30-17m-8-8 9 8-9 8" stroke="currentColor" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export default function BrandLogo({ className = '', markOnly = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="SETPIECE by PerformIQ">
      <RookMark className="h-11 w-11 shrink-0 text-primary" />
      {!markOnly && <span className="leading-none"><span className="block font-display text-2xl font-bold tracking-tight">SETPIECE</span><span className="mt-1 block text-[9px] font-bold tracking-[0.22em] text-primary">BY PERFORMIQ</span></span>}
    </span>
  );
}
