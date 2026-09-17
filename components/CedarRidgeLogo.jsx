import Image from 'next/image';
import logo from '../public/brand/cedar-ridge-logo.png';

// Real Cedar Ridge Reserve wordmark (navy + brass, on a flat white ground —
// no alpha channel). Legible on ivory grounds as-is; on the navy hero it
// needs the light card, since the mark's "Cedar Ridge" text is navy.
export function CedarRidgeLogo({ card = false, className = '' }) {
  const img = <Image src={logo} alt="Cedar Ridge Reserve" className="h-auto w-full" priority />;
  if (card) {
    return (
      <span className={`inline-block max-w-[19rem] rounded-sm bg-crivory px-6 py-5 shadow-lg ${className}`}>
        {img}
      </span>
    );
  }
  return (
    <span className={`inline-block max-w-[16rem] ${className}`}>
      {img}
    </span>
  );
}

// Large faint watermark used behind the navy hero.
export function CedarRidgeWatermark({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`font-crserif select-none text-crivory/[0.06] ${className}`}
      style={{ fontStyle: 'italic' }}
    >
      CR
    </span>
  );
}
