/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure that links work in a static environment (e.g. /about -> /about.html)
  trailingSlash: true,
};

export default nextConfig;
