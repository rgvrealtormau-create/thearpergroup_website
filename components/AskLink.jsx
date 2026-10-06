'use client';

// "Ask about this…" links pre-select a listing in the inquiry form at the bottom of the
// Featured listings page. The form (ListingInquiryForm) listens for this event; the
// link's own href="#contact" does the scrolling, so it still works without JavaScript.
export const SELECT_LISTING_EVENT = 'arper:select-listing';

export default function AskLink({ slug, className = '', children }) {
  return (
    <a
      href="#contact"
      onClick={() => window.dispatchEvent(new CustomEvent(SELECT_LISTING_EVENT, { detail: slug }))}
      className={className}
    >
      {children}
    </a>
  );
}
