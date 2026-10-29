type BrandLogoProps = { className?: string; markOnly?: boolean };

export default function BrandLogo({ className = '', markOnly = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="SETPIECE by PerformIQ">
      <img src={`${import.meta.env.BASE_URL}images/brand/symbol-negativ.svg`} alt="" width="428" height="394" className="h-11 w-12 shrink-0 object-contain" />
      {!markOnly && <img src={`${import.meta.env.BASE_URL}images/brand/schriftzug-weiss.svg`} alt="" width="554" height="178" className="h-auto w-28 object-contain" />}
    </span>
  );
}
