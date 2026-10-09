import { brandLogo } from "../brandLogos";

/** The make's monochrome logo as an inline SVG, or nothing if we don't have one. */
export function BrandLogo({ make, className = "" }: { make: string; className?: string }) {
  const icon = brandLogo(make);
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={icon.path} />
    </svg>
  );
}
