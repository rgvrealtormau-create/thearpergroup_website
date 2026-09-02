/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: false }];
  },
};
export default nextConfig;
