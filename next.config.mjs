/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    const owFrontend = process.env.OW_FRONTEND_URL ?? "https://connect.everstride.fit";
    return [
      {
        source: "/pair/:userId",
        destination: `${owFrontend}/users/:userId/pair`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
