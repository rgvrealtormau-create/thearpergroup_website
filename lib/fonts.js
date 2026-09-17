import localFont from 'next/font/local';
import { Cormorant_Garamond, Jost } from 'next/font/google';

// Halyard — default typeface for body copy, UI, and headings.
export const halyard = localFont({
  src: [
    { path: '../public/fonts/halyard-display-light.otf', weight: '300', style: 'normal' },
    { path: '../public/fonts/halyard-display-regular.otf', weight: '400', style: 'normal' },
    { path: '../public/fonts/halyard-display-medium.otf', weight: '500', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

// Larken italic — reserved for italic accent words and the large pull-quote.
export const larken = localFont({
  src: [
    { path: '../public/fonts/Larken-LightItalic.otf', weight: '300', style: 'italic' },
    { path: '../public/fonts/Larken-Italic.otf', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
});

// Cedar Ridge Reserve carries its own brand inside the site frame. These are
// stand-ins for the licensed wordmark serif — swap for self-hosted files if one is provided.
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cr-display',
  display: 'swap',
});

export const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cr-sans',
  display: 'swap',
});
