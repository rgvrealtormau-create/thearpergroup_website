// Listing photos uploaded in the Arper portal live in its public photo folder. Where the
// portal is comes from a hosting setting (PORTAL_SUPABASE_URL), never from this file.
function portalHost() {
  try {
    return new URL(process.env.PORTAL_SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}
const photoHost = portalHost();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: photoHost
      ? [{ protocol: 'https', hostname: photoHost, pathname: '/storage/v1/object/public/listing-photos/**' }]
      : [],
  },
  async redirects() {
    return [
      { source: '/', destination: '/en', permanent: false },
      // The Featured listings page moved from /communities to /listings. The community pages
      // themselves (/communities/vittoria, /communities/cedar-ridge-reserve) did not move.
      { source: '/:lang(en|es)/communities', destination: '/:lang/listings', permanent: true },
      // Short links printed on the Vittoria model-home sign (keep these stable).
      { source: '/vittoria', destination: '/en/communities/vittoria', permanent: false },
      { source: '/vittoria/check-in', destination: '/en/communities/vittoria/check-in', permanent: false },
    ];
  },
};
export default nextConfig;
