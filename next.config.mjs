/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/en', permanent: false },
      // Short links printed on the Vittoria model-home sign (keep these stable).
      { source: '/vittoria', destination: '/en/communities/vittoria', permanent: false },
      { source: '/vittoria/check-in', destination: '/en/communities/vittoria/check-in', permanent: false },
    ];
  },
};
export default nextConfig;
