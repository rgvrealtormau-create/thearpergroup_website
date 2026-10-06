/** @type {import('next').NextConfig} */
const nextConfig = {
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
