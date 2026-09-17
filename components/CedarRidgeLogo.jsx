import Image from 'next/image';
import logo from '../public/brand/cedar-ridge-logo.png';
import logoReversed from '../public/brand/cedar-ridge-logo-reversed.png';

// Real Cedar Ridge Reserve wordmark. `logo` has navy text on a flat ivory
// ground (for ivory sections); `logoReversed` is transparent with white +
// gold ink (for the navy hero and other dark grounds).
export function CedarRidgeLogo({ reversed = false, className = '' }) {
  const src = reversed ? logoReversed : logo;
  return <Image src={src} alt="Cedar Ridge Reserve" className={`h-auto w-64 ${className}`} priority />;
}
