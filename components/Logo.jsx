import Image from 'next/image';
import arperPetrol from '../public/brand/arper-blue.png';
import arperCream from '../public/brand/imagotipo-06.png';

// Petrol mark for light backgrounds, cream mark for dark backgrounds.
export function Logo({ variant = 'petrol', className = 'h-10 w-auto', priority = false }) {
  return (
    <Image
      src={variant === 'cream' ? arperCream : arperPetrol}
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
