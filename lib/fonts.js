import localFont from 'next/font/local';

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
