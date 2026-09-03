import Image from 'next/image';
import wordmark from '../public/brand/wordmark-blue.png';
import arperCream from '../public/brand/imagotipo-06.png';

// Wordmark-only mark for the header (transparent petrol, natural size 1118x220).
export function Logo({ className = 'h-7 w-auto', priority = false }) {
  return (
    <Image
      src={wordmark}
      alt="The Arper Group"
      className={className}
      priority={priority}
    />
  );
}

export function LogoLockup({ className = 'h-16 w-auto' }) {
  return (
    <Image
      src={arperCream}
      alt="The Arper Group"
      className={className}
    />
  );
}
