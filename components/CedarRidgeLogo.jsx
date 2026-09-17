import Image from 'next/image';
import logo from '../public/brand/cedar-ridge-logo.png';

// Real Cedar Ridge Reserve wordmark (navy + brass, on a flat white ground —
// no alpha channel). Legible on ivory grounds as-is; on the navy hero it
// needs the light card, since the mark's "Cedar Ridge" text is navy.
export function CedarRidgeLogo({ card = false, className = '' }) {
  const img = <Image src={logo} alt="Cedar Ridge Reserve" className="h-auto w-full" priority />;
  if (card) {
    return (
      <span className={`inline-block max-w-[15rem] rounded-sm bg-crivory px-5 py-4 shadow-lg ${className}`}>
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
